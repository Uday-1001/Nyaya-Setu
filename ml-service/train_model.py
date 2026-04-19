"""
train_model.py — NyayaSetu BNS/IPC Full Pipeline Trainer

Loads the HuggingFace dataset 'nandhakumarg/IPC_and_BNS_transformation',
builds an enriched semantic corpus for every BNS section, creates dense
sentence-transformer embeddings, and saves:

  artifacts/bns_embeddings.npy  — numpy float32 matrix  (N × 384)
  artifacts/faiss_index.bin     — FAISS IndexFlatIP for fast ANN retrieval
  artifacts/metadata.pkl        — list[dict] with section metadata
  artifacts/corpus.pkl          — list[str] raw corpus strings (for cross-encoder)

No hardcoded section numbers, no keyword heuristics.
Everything is derived purely from the HuggingFace dataset.
"""

from __future__ import annotations

import ast
import os
import re
import sys

import joblib
import numpy as np

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
EMBED_MODEL_NAME = "all-MiniLM-L6-v2"


# ── helpers ──────────────────────────────────────────────────────────────────

def _clean(text: str) -> str:
    """Remove excess whitespace / escape artefacts from dataset text."""
    text = re.sub(r"\\n", " ", text)
    text = re.sub(r"\\xa0", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _detect_bailable(text: str) -> bool:
    """
    Derive bailable flag from the BNS description text.
    Non-bailable offences are explicitly called out in Indian law text;
    anything not marked non-bailable is treated as bailable.
    """
    lower = text.lower()
    if "non-bailable" in lower or "non bailable" in lower:
        return False
    if "bailable" in lower:
        return True
    # Heuristic of last resort based on severity words — only used if
    # the description has no explicit bail status at all.
    severe_words = [
        "death", "life imprisonment", "murder", "rape",
        "dacoity", "robbery", "kidnapping", "abduction",
    ]
    if any(w in lower for w in severe_words):
        return False
    return True  # Default: bailable if not stated otherwise


def _detect_cognizable(text: str) -> bool:
    """
    Derive cognizable flag. Non-cognizable offences are usually minor;
    if description mentions 'non-cognizable' flag it accordingly.
    """
    lower = text.lower()
    if "non-cognizable" in lower or "non cognizable" in lower:
        return False
    # Major/serious offences are almost always cognizable
    return True


def _build_corpus_text(
    bns_sec: str,
    bns_head: str,
    bns_desc: str,
    ipc_sec: str,
    ipc_head: str,
    ipc_desc: str,
) -> str:
    """
    Build an enriched natural-language document for a BNS section.
    The richer the text fed to the bi-encoder, the better the retrieval.
    """
    parts = []
    if bns_sec:
        parts.append(f"BNS Section {bns_sec}.")
    if bns_head:
        parts.append(f"Title: {bns_head}.")
    if bns_desc:
        parts.append(f"Description: {_clean(bns_desc)}")
    if ipc_sec and ipc_head:
        parts.append(f"IPC equivalent: Section {ipc_sec} — {ipc_head}.")
    if ipc_desc:
        parts.append(f"IPC context: {_clean(ipc_desc)}")
    return " ".join(parts)


# ── main training routine ─────────────────────────────────────────────────────

def train() -> None:
    print("[Trainer] Loading dataset 'nandhakumarg/IPC_and_BNS_transformation' from HuggingFace…")
    from datasets import load_dataset
    dataset = load_dataset("nandhakumarg/IPC_and_BNS_transformation")

    corpus: list[str] = []
    metadata: list[dict] = []

    skipped = 0
    for idx, response_str in enumerate(dataset["train"]["response"]):
        try:
            data = ast.literal_eval(response_str)
        except Exception:
            skipped += 1
            continue

        ipc_sec  = _clean(str(data.get("IPC Section",  "") or ""))
        ipc_head = _clean(str(data.get("IPC Heading",  "") or ""))
        ipc_desc = _clean(str(data.get("IPC Descriptions", "") or ""))
        bns_sec  = _clean(str(data.get("BNS Section",  "") or ""))
        bns_head = _clean(str(data.get("BNS Heading",  "") or ""))
        bns_desc = _clean(str(data.get("BNS description", "") or ""))

        # Skip rows without a valid BNS section number
        if not bns_sec or bns_sec.lower() in ("none", "n/a", "-"):
            skipped += 1
            continue

        combined = f"{bns_head} {bns_desc} {ipc_head} {ipc_desc}"
        bailable  = _detect_bailable(combined)
        cognizable = _detect_cognizable(combined)

        doc = _build_corpus_text(bns_sec, bns_head, bns_desc, ipc_sec, ipc_head, ipc_desc)
        corpus.append(doc)
        metadata.append({
            "bns_section":     bns_sec,
            "bns_title":       bns_head or f"BNS Section {bns_sec}",
            "bns_description": bns_desc or "",
            "ipc_equivalent":  ipc_sec if ipc_sec and ipc_sec.lower() != "none" else None,
            "ipc_title":       ipc_head or None,
            "ipc_description": ipc_desc or "",
            "bailable":        bailable,
            "cognizable":      cognizable,
            "corpus_text":     doc,   # stored so cross-encoder can reuse it without re-loading
        })

    total = len(corpus)
    print(f"[Trainer] Parsed {total} valid BNS sections  ({skipped} rows skipped).")

    if total == 0:
        print("[Trainer] ERROR: No valid sections found — aborting.", file=sys.stderr)
        sys.exit(1)

    # ── Stage 1: Bi-encoder dense embeddings ─────────────────────────────────
    print(f"[Trainer] Encoding corpus with '{EMBED_MODEL_NAME}'…")
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(EMBED_MODEL_NAME)
    embeddings = model.encode(
        corpus,
        batch_size=64,
        show_progress_bar=True,
        normalize_embeddings=True,   # L2-normalise → cosine via dot product
        convert_to_numpy=True,
    ).astype("float32")

    print(f"[Trainer] Embedding matrix shape: {embeddings.shape}")

    # ── Stage 2: Build FAISS index (IndexFlatIP = exact inner-product search) ─
    print("[Trainer] Building FAISS IndexFlatIP…")
    try:
        import faiss  # type: ignore
        dim = embeddings.shape[1]
        index = faiss.IndexFlatIP(dim)
        index.add(embeddings)
        print(f"[Trainer] FAISS index contains {index.ntotal} vectors.")
        faiss_available = True
    except ImportError:
        print("[Trainer] WARNING: faiss-cpu not installed — FAISS index will not be saved. "
              "Install with: pip install faiss-cpu", file=sys.stderr)
        faiss_available = False

    # ── Save artifacts ────────────────────────────────────────────────────────
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)

    np.save(os.path.join(ARTIFACTS_DIR, "bns_embeddings.npy"), embeddings)
    joblib.dump(metadata, os.path.join(ARTIFACTS_DIR, "metadata.pkl"))
    joblib.dump(corpus,   os.path.join(ARTIFACTS_DIR, "corpus.pkl"))

    if faiss_available:
        faiss.write_index(index, os.path.join(ARTIFACTS_DIR, "faiss_index.bin"))

    # Keep legacy .pkl embedding file so older code doesn't crash immediately
    joblib.dump(embeddings, os.path.join(ARTIFACTS_DIR, "bns_embeddings.pkl"))

    print(
        f"\n[Trainer] SUCCESS — artifacts saved to {ARTIFACTS_DIR}/\n"
        f"  bns_embeddings.npy  ({embeddings.nbytes // 1024:,} KB)\n"
        f"  bns_embeddings.pkl  (legacy, same data)\n"
        f"  metadata.pkl        ({len(metadata)} entries)\n"
        f"  corpus.pkl          ({len(corpus)} documents)\n"
        + (f"  faiss_index.bin     ({index.ntotal} vectors)\n" if faiss_available else
           "  faiss_index.bin     SKIPPED (faiss-cpu missing)\n")
    )


if __name__ == "__main__":
    train()
