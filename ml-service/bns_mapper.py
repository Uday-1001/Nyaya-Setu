"""
bns_mapper.py — NyayaSetu RAG Classification Engine

Two-stage pipeline, no hardcoding, no hallucination:

  Stage 1 — Bi-encoder retrieval (FAISS ANN or numpy fallback)
    • Query → all-MiniLM-L6-v2 embedding → top-20 BNS candidates

  Stage 2 — Cross-encoder re-ranking
    • (query, candidate_doc) pairs → cross-encoder/ms-marco-MiniLM-L-6-v2
    • Precision relevance score per candidate, sorted descending

  Confidence gate
    • Best cross-encoder score < CONFIDENCE_THRESHOLD → return "Pending"
    • Never fabricates a section when the statement is ambiguous
"""

from __future__ import annotations

import os
from typing import Any

import joblib
import numpy as np

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")

# Bi-encoder model — must match what train_model.py used
BIENCODER_MODEL  = "all-MiniLM-L6-v2"

# Cross-encoder for re-ranking (lightweight, fast on CPU)
CROSSENCODER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"

# If the best cross-encoder score is below this, return "Pending" (human review).
# Calibrated from observed score distribution on the BNS dataset:
#   Relevant matches:  -5 to -8  (e.g. theft query → theft section)
#   Irrelevant/vague: -10 to -12 (e.g. "I want to file a general complaint")
CONFIDENCE_THRESHOLD = -9.0

# How many candidates to retrieve from FAISS before re-ranking
RETRIEVAL_TOP_K = 20

# Final top-K sections returned to the caller
RESULT_TOP_K = 5


# ── Singleton model cache ─────────────────────────────────────────────────────

_biencoder   = None
_crossencoder = None
_faiss_index = None
_embeddings  = None   # numpy fallback if FAISS unavailable
_metadata: list[dict] = []
_corpus:   list[str]  = []


def _load_models() -> None:
    global _biencoder, _crossencoder, _faiss_index, _embeddings, _metadata, _corpus

    # ── Bi-encoder ────────────────────────────────────────────────────────────
    print(f"[BnsMapper] Loading bi-encoder '{BIENCODER_MODEL}'…")
    from sentence_transformers import SentenceTransformer
    _biencoder = SentenceTransformer(BIENCODER_MODEL)

    # ── Cross-encoder ─────────────────────────────────────────────────────────
    print(f"[BnsMapper] Loading cross-encoder '{CROSSENCODER_MODEL}'…")
    from sentence_transformers import CrossEncoder
    _crossencoder = CrossEncoder(CROSSENCODER_MODEL, max_length=512)

    # ── Artifacts ──────────────────────────────────────────────────────────────
    meta_path    = os.path.join(ARTIFACTS_DIR, "metadata.pkl")
    corpus_path  = os.path.join(ARTIFACTS_DIR, "corpus.pkl")
    faiss_path   = os.path.join(ARTIFACTS_DIR, "faiss_index.bin")
    npy_path     = os.path.join(ARTIFACTS_DIR, "bns_embeddings.npy")
    pkl_path     = os.path.join(ARTIFACTS_DIR, "bns_embeddings.pkl")   # legacy

    if not os.path.exists(meta_path):
        print("[BnsMapper] Artifacts not found — running train_model.py now…")
        from train_model import train
        train()

    _metadata = joblib.load(meta_path)
    _corpus   = joblib.load(corpus_path) if os.path.exists(corpus_path) else [
        m.get("corpus_text", m.get("bns_title", "")) for m in _metadata
    ]

    # Prefer FAISS index; fall back to numpy cosine
    if os.path.exists(faiss_path):
        try:
            import faiss  # type: ignore
            _faiss_index = faiss.read_index(faiss_path)
            print(f"[BnsMapper] FAISS index loaded — {_faiss_index.ntotal} vectors.")
        except ImportError:
            print("[BnsMapper] faiss-cpu not available — using numpy fallback.")
            _faiss_index = None

    if _faiss_index is None:
        if os.path.exists(npy_path):
            _embeddings = np.load(npy_path).astype("float32")
        elif os.path.exists(pkl_path):
            raw = joblib.load(pkl_path)
            _embeddings = np.array(raw, dtype="float32")
        else:
            raise RuntimeError(
                "No embedding artifacts found. Run train_model.py first."
            )
        print(f"[BnsMapper] Numpy embeddings loaded — shape {_embeddings.shape}.")

    print(
        f"[BnsMapper] Ready — {len(_metadata)} sections, "
        f"FAISS={'yes' if _faiss_index is not None else 'no (numpy fallback)'}, "
        f"CrossEncoder=yes."
    )


def _ensure_loaded() -> None:
    if _biencoder is None:
        _load_models()


def export_catalog_entries() -> list[dict[str, Any]]:
    """
    Export unique BNS catalog entries from trained artifacts.
    This lets downstream services seed their DB without local hardcoded maps.
    """
    _ensure_loaded()

    by_section: dict[str, dict[str, Any]] = {}
    for meta in _metadata:
        sec = str(meta.get("bns_section") or "").strip()
        if not sec or sec.lower() in {"none", "n/a", "-"}:
            continue

        title = str(meta.get("bns_title") or f"BNS Section {sec}").strip()
        description = str(meta.get("bns_description") or "").strip() or title
        ipc_equivalent = meta.get("ipc_equivalent")
        ipc_title = meta.get("ipc_title")
        ipc_description = meta.get("ipc_description")

        candidate = {
            "sectionNumber": sec,
            "sectionTitle": title,
            "description": description,
            "category": "OTHER",
            "ipcEquivalent": str(ipc_equivalent).strip() if ipc_equivalent else None,
            "ipcTitle": str(ipc_title).strip() if ipc_title else None,
            "ipcDescription": str(ipc_description).strip() if ipc_description else None,
            "isBailable": bool(meta.get("bailable", False)),
            "isCognizable": bool(meta.get("cognizable", True)),
            "isCompoundable": False,
            "mappingReasoning": "Synced from trained HuggingFace IPC/BNS transformation dataset artifacts.",
        }

        existing = by_section.get(sec)
        if existing is None:
            by_section[sec] = candidate
            continue

        # Prefer entries with richer IPC mapping and longer legal text.
        has_existing_ipc = bool(existing.get("ipcEquivalent"))
        has_candidate_ipc = bool(candidate.get("ipcEquivalent"))
        if has_candidate_ipc and not has_existing_ipc:
            by_section[sec] = candidate
            continue

        if len(candidate["description"]) > len(existing.get("description") or ""):
            by_section[sec] = candidate

    return sorted(by_section.values(), key=lambda x: x["sectionNumber"])


# ── Core prediction ───────────────────────────────────────────────────────────

def predict(text: str, top_k: int = RESULT_TOP_K) -> list[dict[str, Any]]:
    """
    Full RAG pipeline:
      1. Encode query with bi-encoder (L2-normalised)
      2. Retrieve top-RETRIEVAL_TOP_K candidates via FAISS (or numpy cosine)
      3. Re-rank with cross-encoder
      4. Apply confidence gate
      5. Return top-K unique BNS sections

    Returns an empty list with section_number="Pending" when confidence is too low.
    """
    _ensure_loaded()

    clean = text.strip()
    if not clean:
        return []

    # ── Stage 1: Bi-encoder retrieval ─────────────────────────────────────────
    query_vec = _biencoder.encode(
        [clean],
        normalize_embeddings=True,
        convert_to_numpy=True,
    ).astype("float32")  # shape: (1, 384)

    retrieve_k = min(RETRIEVAL_TOP_K, len(_metadata))

    if _faiss_index is not None:
        scores, indices = _faiss_index.search(query_vec, retrieve_k)
        candidate_indices = indices[0].tolist()
    else:
        # numpy dot product (embeddings are L2-normalised → equivalent to cosine)
        sims = (_embeddings @ query_vec.T).squeeze()
        candidate_indices = sims.argsort()[-retrieve_k:][::-1].tolist()

    # ── Stage 2: Cross-encoder re-ranking ────────────────────────────────────
    pairs = [(clean, _corpus[i]) for i in candidate_indices]
    ce_scores = _crossencoder.predict(pairs, show_progress_bar=False)

    ranked = sorted(
        zip(candidate_indices, ce_scores),
        key=lambda x: x[1],
        reverse=True,
    )

    # ── Confidence gate ────────────────────────────────────────────────────────
    best_score = ranked[0][1] if ranked else -999
    if best_score < CONFIDENCE_THRESHOLD:
        return [{
            "section_number": "Pending",
            "confidence":     0.0,
            "title":          "Manual Legal Review Required",
            "ipc_equivalent": None,
            "ipc_title":      None,
            "cognizable":     False,
            "bailable":       False,
            "rag_used":       True,
        }]

    # ── Dedup + top-K ─────────────────────────────────────────────────────────
    results: list[dict[str, Any]] = []
    seen: set[str] = set()

    for idx, ce_score in ranked:
        meta = _metadata[idx]
        sec = meta["bns_section"]
        if sec in seen:
            continue
        seen.add(sec)

        # Normalise cross-encoder score to [0, 1] with a sigmoid.
        # Shift the raw score so the threshold corresponds to ~0.5 confidence.
        import math
        shifted_score = ce_score - CONFIDENCE_THRESHOLD
        confidence = round(1 / (1 + math.exp(-shifted_score)), 4)

        results.append({
            "section_number": sec,
            "confidence":     confidence,
            "title":          meta.get("bns_title") or f"BNS Section {sec}",
            "ipc_equivalent": meta.get("ipc_equivalent"),
            "ipc_title":      meta.get("ipc_title"),
            "cognizable":     meta.get("cognizable", True),
            "bailable":       meta.get("bailable", False),
            "rag_used":       True,
        })

        if len(results) >= top_k:
            break

    return results


# ── Singleton wrapper (backward-compat with existing code) ────────────────────

class DynamicBnsMapper:
    """
    Thin wrapper so existing import paths continue to work:
        from bns_mapper import get_bns_mapper
        mapper = get_bns_mapper()
        results = mapper.predict(text, top_k=5)
    """

    def predict(self, text: str, top_k: int = RESULT_TOP_K) -> list[dict[str, Any]]:
        return predict(text, top_k=top_k)


_singleton: DynamicBnsMapper | None = None


def get_bns_mapper() -> DynamicBnsMapper:
    global _singleton
    if _singleton is None:
        _ensure_loaded()        # warm up models + artifacts
        _singleton = DynamicBnsMapper()
    return _singleton
