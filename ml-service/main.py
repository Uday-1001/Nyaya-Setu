"""
NyayaSetu ML API — v3.0

All BNS/IPC mapping is done exclusively via the trained RAG pipeline:
  Stage 1 — Bi-encoder (all-MiniLM-L6-v2) + FAISS ANN retrieval
  Stage 2 — Cross-encoder re-ranking (ms-marco-MiniLM-L-6-v2)
  Stage 3 — Confidence gate (returns 'Pending' instead of hallucinating)

Voice is handled by openai-whisper (large model).

Endpoints:
  GET  /health              — service/model status
    GET  /v1/catalog          — trained BNS catalog rows for backend sync
  POST /v1/pipeline         — multipart: audio file + metadata fields
  POST /v1/pipeline/json    — JSON: raw_text / rawComplaintText
  POST /v1/classify         — JSON text → BNS/IPC classification only
  POST /v1/rag              — JSON text → full RAG result with explanations
  POST /v1/transcribe       — multipart: audio → transcript only
"""

from __future__ import annotations

import io
import os
import sys
import tempfile
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from tqdm import tqdm

from bns_mapper import export_bnss_catalog_entries, export_catalog_entries, get_bns_mapper

# ── Whisper lazy-loader ──────────────────────────────────────────────────────
_WHISPER_MODEL    = None
_WHISPER_AVAILABLE = False
_WHISPER_DEVICE   = "cpu"
_WHISPER_USE_FP16 = False
WHISPER_MODEL_NAME = "large"


def _detect_device() -> tuple[str, bool]:
    try:
        import torch
        if torch.cuda.is_available():
            gpu = torch.cuda.get_device_name(0)
            print(f"[Whisper] CUDA GPU: {gpu} — fp16 enabled")
            return "cuda", True
    except Exception:
        pass
    print("[Whisper] No CUDA GPU — using CPU fp32")
    return "cpu", False


def _load_whisper():
    global _WHISPER_MODEL, _WHISPER_AVAILABLE, _WHISPER_DEVICE, _WHISPER_USE_FP16
    if _WHISPER_AVAILABLE:
        return _WHISPER_MODEL
    try:
        import whisper
        device, use_fp16 = _detect_device()
        _WHISPER_DEVICE   = device
        _WHISPER_USE_FP16 = use_fp16
        print(f"[Whisper] Loading '{WHISPER_MODEL_NAME}' on {device}…")
        _WHISPER_MODEL    = whisper.load_model(WHISPER_MODEL_NAME, device=device)
        _WHISPER_AVAILABLE = True
        print(f"[Whisper] '{WHISPER_MODEL_NAME}' ready on {device}.")
    except Exception as exc:
        print(f"[Whisper] Failed to load: {exc}")
        _WHISPER_MODEL    = None
        _WHISPER_AVAILABLE = False
    return _WHISPER_MODEL


def _whisper_transcribe_bytes(audio_bytes: bytes, filename: str, language: str) -> str:
    """Transcribe audio bytes → English text via Whisper."""
    model = _load_whisper()
    if model is None:
        return ""
    try:
        suffix = Path(filename or "recording.webm").suffix or ".webm"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        try:
            transcribe_kwargs = {
                "task": "translate",
                "language": None,
                "fp16": _WHISPER_USE_FP16,
                "temperature": 0.0,
                "best_of": 1,
                "beam_size": 3,
                "condition_on_previous_text": True,
            }

            # Show live CLI progress while ASR runs.
            with ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(model.transcribe, tmp_path, **transcribe_kwargs)
                progress = 0
                next_milestone = 10
                print(
                    f"[ASR] Started transcription | model={WHISPER_MODEL_NAME} | file={filename or 'recording.webm'} | bytes={len(audio_bytes)}",
                    flush=True,
                )
                with tqdm(
                    total=100,
                    desc="ASR (Whisper large)",
                    unit="%",
                    file=sys.stdout,
                    dynamic_ncols=True,
                    ascii=True,
                    mininterval=0.1,
                    disable=False,
                    leave=True,
                ) as pbar:
                    while not future.done():
                        time.sleep(0.25)
                        if progress < 95:
                            progress += 1
                            pbar.update(1)
                            if progress >= next_milestone:
                                print(
                                    f"[ASR] Progress: {next_milestone}%",
                                    flush=True,
                                )
                                next_milestone += 10
                    if progress < 100:
                        pbar.update(100 - progress)
                    if next_milestone <= 100:
                        print("[ASR] Progress: 100%", flush=True)
                result = future.result()
                print("[ASR] Completed transcription", flush=True)

            text = (result.get("text") or "").strip()
            detected = result.get("language", "unknown")
            print(f"[Whisper] lang={detected} | {len(audio_bytes)} bytes → {len(text)} chars")
            return text
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
    except Exception as exc:
        print(f"[Whisper] Transcription error: {exc}")
        return ""


# Warm up Whisper in background so first request is fast
threading.Thread(target=_load_whisper, daemon=True).start()

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(title="NyayaSetu ML", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic request models ───────────────────────────────────────────────────

class TextBody(BaseModel):
    raw_text:          str        = ""
    rawComplaintText:  str | None = None
    language:          str        = "hi"

class RagBody(BaseModel):
    raw_text:         str        = ""
    rawComplaintText: str | None = None
    language:         str        = "hi"
    top_k:            int        = 5


# ── Core classification helper ────────────────────────────────────────────────

def _classify_text(text: str) -> list[dict[str, Any]]:
    """Run the full RAG pipeline on a text string. Returns raw mapper results."""
    try:
        mapper = get_bns_mapper()
        return mapper.predict(text, top_k=5)
    except Exception as exc:
        print(f"[ML] RAG pipeline error: {exc}")
        return []


def _build_pipeline_response(
    transcript: str,
    raw_text: str,
    language: str,
    classifications: list[dict[str, Any]],
) -> dict[str, Any]:
    """Convert mapper output → unified API response shape."""

    # If nothing came back or first result is Pending, signal for manual review
    if (
        not classifications
        or classifications[0].get("section_number") == "Pending"
    ):
        return {
            "transcript":           transcript or raw_text,
            "raw_complaint_text":   raw_text or transcript,
            "entities": {
                "language":    language,
                "engine":      "rag-biencoder-crossencoder",
                "cognizable":  False,
                "bailable":    True,
                "ipc_equivalents": {},
            },
            "classifications":        [],
            "primary_section_number": "Pending",
            "urgency_level":          "LOW",
            "urgency_reason":         (
                "Statement could not be mapped to a precise BNS section with sufficient "
                "confidence. Manual officer review required."
            ),
            "severity_score":   0.0,
            "rag_used":         True,
            "victim_rights": {
                "summary": "You can request a free FIR copy, preserve evidence, and use Zero FIR where applicable.",
                "bullets": [
                    "Request your FIR copy or acknowledgment number.",
                    "Preserve audio, screenshots, bills, and witness details.",
                    "Use the nearest police station if jurisdiction is unclear.",
                ],
            },
            "model_version": "nyayasetu-rag-v3",
        }

    primary = classifications[0]
    pri_num  = primary["section_number"]
    pri_conf = primary["confidence"]
    is_non_bailable = not primary.get("bailable", True)

    ipc_equivalents = {
        c["section_number"]: c["ipc_equivalent"]
        for c in classifications
        if c.get("ipc_equivalent")
    }

    # Urgency from confidence + bail status
    if is_non_bailable and pri_conf >= 0.6:
        urgency_level = "CRITICAL"
    elif is_non_bailable or pri_conf >= 0.7:
        urgency_level = "HIGH"
    elif pri_conf >= 0.5:
        urgency_level = "MEDIUM"
    else:
        urgency_level = "LOW"

    bail_label = "Non-bailable" if is_non_bailable else "Bailable"

    return {
        "transcript":           transcript or raw_text,
        "raw_complaint_text":   raw_text or transcript,
        "entities": {
            "language":    language,
            "engine":      "rag-biencoder-crossencoder",
            "cognizable":  primary.get("cognizable", True),
            "bailable":    primary.get("bailable", False),
            "ipc_equivalents": ipc_equivalents,
        },
        "classifications":        classifications,
        "primary_section_number": pri_num,
        "urgency_level":          urgency_level,
        "urgency_reason": (
            f"BNS §{pri_num} — {primary.get('title', 'Section')} "
            f"(Confidence: {pri_conf:.0%}) — {bail_label} offense."
        ),
        "severity_score": pri_conf,
        "rag_used":        True,
        "victim_rights": {
            "summary": "You can request a free FIR copy, preserve evidence, and use Zero FIR where applicable.",
            "bullets": [
                "Request your FIR copy or acknowledgment number.",
                "Preserve audio, screenshots, bills, and witness details.",
                "Use the nearest police station if jurisdiction is unclear.",
            ],
        },
        "model_version": "nyayasetu-rag-v3",
    }


def _run_text_pipeline(text: str, language: str) -> dict[str, Any]:
    clean = text.strip()
    classifications = _classify_text(clean)
    return _build_pipeline_response(clean, clean, language, classifications)


def _run_audio_pipeline(
    audio_bytes: bytes,
    filename: str,
    language: str,
    raw_text: str = "",
) -> dict[str, Any]:
    transcript = _whisper_transcribe_bytes(audio_bytes, filename, language)
    if not transcript:
        transcript = "[Whisper large transcription unavailable]"
    classifications = _classify_text(transcript)
    return _build_pipeline_response(transcript, raw_text, language, classifications)


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health() -> dict[str, Any]:
    catalog_count = 0
    try:
        catalog_count = len(export_catalog_entries())
    except Exception as exc:
        print(f"[health] Unable to read catalog entries: {exc}")

    return {
        "status":          "ok",
        "engine":          "rag-biencoder-crossencoder",
        "rag_enabled":     True,
        "no_hallucination_mode": True,
        "whisper_model":   WHISPER_MODEL_NAME,
        "whisper_device":  _WHISPER_DEVICE,
        "whisper_status":  "loaded" if _WHISPER_AVAILABLE else "loading",
        "catalog_sections": catalog_count,
    }


@app.get("/v1/catalog")
def catalog() -> dict[str, Any]:
    """Return BNS catalog rows derived from trained dataset artifacts."""
    try:
        rows = export_catalog_entries()
        return {
            "count": len(rows),
            "rows": rows,
            "source": "nandhakumarg/IPC_and_BNS_transformation",
            "model_version": "nyayasetu-rag-v3",
        }
    except Exception as exc:
        print(f"[catalog] export failed: {exc}")
        return {
            "count": 0,
            "rows": [],
            "source": "nandhakumarg/IPC_and_BNS_transformation",
            "model_version": "nyayasetu-rag-v3",
            "error": str(exc),
        }


@app.get("/v1/bnss-catalog")
def bnss_catalog() -> dict[str, Any]:
    """Return BNSS catalog rows derived from trained CRPC-BNSS artifacts."""
    try:
        rows = export_bnss_catalog_entries()
        return {
            "count": len(rows),
            "rows": rows,
            "source": "local CRPC-BNSS PDF extraction + trained artifacts",
            "model_version": "nyayasetu-rag-v3",
        }
    except Exception as exc:
        print(f"[bnss-catalog] export failed: {exc}")
        return {
            "count": 0,
            "rows": [],
            "source": "local CRPC-BNSS PDF extraction + trained artifacts",
            "model_version": "nyayasetu-rag-v3",
            "error": str(exc),
        }


@app.post("/v1/pipeline/json")
async def pipeline_json(payload: TextBody) -> dict[str, Any]:
    text = (payload.rawComplaintText or payload.raw_text or "").strip()
    return _run_text_pipeline(text, payload.language)


@app.post("/v1/pipeline")
async def pipeline_multipart(
    audio:             UploadFile | None = File(default=None),
    language:          str               = Form("hi"),
    raw_text:          str               = Form(""),
    rawComplaintText:  str               = Form(""),
) -> dict[str, Any]:
    text = (rawComplaintText or raw_text or "").strip()
    if audio is None:
        return _run_text_pipeline(text, language)
    audio_bytes = await audio.read()
    return _run_audio_pipeline(audio_bytes, audio.filename or "recording.wav", language, text)


@app.post("/v1/classify")
async def classify(payload: TextBody) -> dict[str, Any]:
    text   = (payload.rawComplaintText or payload.raw_text or "").strip()
    result = _run_text_pipeline(text, payload.language)
    return {
        "classifications":        result["classifications"],
        "primary_section_number": result["primary_section_number"],
        "urgency_level":          result["urgency_level"],
        "urgency_reason":         result["urgency_reason"],
        "severity_score":         result["severity_score"],
        "rag_used":               result["rag_used"],
        "model_version":          result["model_version"],
    }


@app.post("/v1/rag")
async def rag_endpoint(payload: RagBody) -> dict[str, Any]:
    """
    Full RAG endpoint — returns bi-encoder retrieval + cross-encoder ranked
    BNS/IPC sections with confidence scores, bail/cognizability status,
    IPC equivalents, and urgency assessment.
    """
    text  = (payload.rawComplaintText or payload.raw_text or "").strip()
    top_k = max(1, min(payload.top_k, 10))   # clamp 1–10

    if not text:
        return {
            "error":           "No input text provided.",
            "classifications": [],
            "rag_used":        True,
            "model_version":   "nyayasetu-rag-v3",
        }

    try:
        mapper = get_bns_mapper()
        classifications = mapper.predict(text, top_k=top_k)
    except Exception as exc:
        print(f"[RAG] Pipeline error: {exc}")
        classifications = []

    result = _build_pipeline_response(text, text, payload.language, classifications)

    # Add per-result explanation fields for the RAG endpoint
    for c in result.get("classifications", []):
        ipc = c.get("ipc_equivalent")
        ipc_title = c.get("ipc_title")
        c["explanation"] = (
            f"BNS §{c['section_number']} — {c.get('title', '')}. "
            + (f"IPC equivalent: §{ipc} ({ipc_title})." if ipc else "No direct IPC equivalent.")
            + f" {'Non-bailable' if not c.get('bailable') else 'Bailable'}, "
            + f"{'cognizable' if c.get('cognizable') else 'non-cognizable'} offense."
        )

    return result


@app.post("/v1/transcribe")
async def transcribe(
    audio:    UploadFile = File(...),
    language: str        = Form("hi"),
) -> dict[str, Any]:
    try:
        audio_bytes = await audio.read()
        if not audio_bytes:
            return {
                "transcript":    "",
                "language":      language,
                "model_version": f"whisper-{WHISPER_MODEL_NAME}",
                "error":         "empty audio",
            }
        transcript = _whisper_transcribe_bytes(audio_bytes, audio.filename or "recording.wav", language)
        return {
            "transcript":    transcript,
            "language":      language,
            "model_version": f"whisper-{WHISPER_MODEL_NAME}",
        }
    except Exception as exc:
        print(f"[transcribe] Error: {exc}")
        return {
            "transcript":    "",
            "language":      language,
            "model_version": f"whisper-{WHISPER_MODEL_NAME}",
            "error":         str(exc),
        }