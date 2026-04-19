"""
Extract CRPC-BNSS mapping rows from a PDF into the exact schema used by
the current IPC-BNS pipeline.

Output row schema (exact keys):
  - IPC Section
  - IPC Heading
  - IPC Descriptions
  - BNS Section
  - BNS Heading
  - BNS description

For CRPC-BNSS extraction, "IPC *" fields are populated with CRPC values so the
existing training/data-loading format stays unchanged.

Usage:
  python extract_crpc_bnss_mapping.py \
    --pdf path/to/crpc_bnss.pdf \
    --out-jsonl crpc_bnss_mapped.jsonl \
    --out-csv crpc_bnss_mapped.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import pdfplumber


REQUIRED_KEYS = (
    "IPC Section",
    "IPC Heading",
    "IPC Descriptions",
    "BNS Section",
    "BNS Heading",
    "BNS description",
)

MAX_BNSS_SECTION = 531


def _clean(text: str) -> str:
    text = text or ""
    text = text.replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _looks_like_header(cells: list[str]) -> bool:
    joined = " ".join(c.lower() for c in cells)
    return (
        "crpc" in joined
        and "bnss" in joined
        and (
            "section" in joined
            or "heading" in joined
            or "description" in joined
        )
    )


def _best_col_index(headers: list[str], options: Iterable[str], fallback: int) -> int:
    lowered = [h.lower() for h in headers]
    for token in options:
        token_l = token.lower()
        for i, h in enumerate(lowered):
            if token_l in h:
                return i
    return fallback


@dataclass
class ColMap:
    bnss_sec: int
    subject: int
    crpc_sec: int
    summary: int


def _infer_columns(header_row: list[str]) -> ColMap:
    # The provided PDF uses: BNSS Sections | Subject | CrPC Sections | Summary.
    # Map those into the existing IPC/BNS schema expected by training.
    bnss_sec = _best_col_index(
        header_row,
        ["bnss section", "bnss sections", "new section", "new sections", "bnss sec"],
        0,
    )
    subject = _best_col_index(header_row, ["subject", "heading", "title"], 1)
    crpc_sec = _best_col_index(
        header_row,
        ["crpc section", "crpc sections", "old section", "old sections", "crpc sec"],
        2,
    )
    summary = _best_col_index(
        header_row,
        ["summary", "comparison", "description", "details"],
        3,
    )
    return ColMap(
        bnss_sec=bnss_sec,
        subject=subject,
        crpc_sec=crpc_sec,
        summary=summary,
    )


def _safe_cell(row: list[str], idx: int) -> str:
    if idx < 0 or idx >= len(row):
        return ""
    return _clean(row[idx])


def _normalize_section_token(token: str) -> str:
    token = _clean(token)
    token = re.sub(r"\s+", "", token)
    return token


def _parse_text_rows(pdf_path: Path, include_subsections: bool) -> list[dict[str, str]]:
    """
    Parse correspondence rows from PDF text lines.

    Expected line pattern from this document family:
      <BNSS section> <Subject> <CrPC section> <Summary...>
    """
    rows: list[dict[str, str]] = []

    # BNSS section can be "123" or "2(1)(a)" style.
    section_pat = re.compile(r"^(?P<bnss>\d+[A-Za-z]?(?:\([^\)]+\))*)\s+")
    line_pat = re.compile(
        r"^(?P<bnss>\d+[A-Za-z]?(?:\([^\)]+\))*)\s+"
        r"(?P<subject>.+?)\s+"
        # CrPC token must be '-' or a numeric section-style token.
        r"(?P<crpc>-|\d[\dA-Za-z\.\-\[\]]*(?:\s*\([^\)]+\))*\]?)"
        r"(?:\s+(?P<summary>.*))?$"
    )

    ignored_starts = (
        "CORRESPONDENCE TABLE",
        "BHARATIYA NAGARIK SURAKSHA SANHITA",
        "BNSS Subject",
        "Sections",
        "© ",
        "Page ",
    )

    current: dict[str, str] | None = None

    with pdfplumber.open(str(pdf_path)) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            for raw_line in text.splitlines():
                line = _clean(raw_line)
                if not line:
                    continue
                if any(line.startswith(prefix) for prefix in ignored_starts):
                    continue

                # Start of a new correspondence row.
                m = line_pat.match(line)
                if m:
                    bnss_sec = _normalize_section_token(m.group("bnss"))
                    subject = _clean(m.group("subject"))
                    crpc_sec = _normalize_section_token(m.group("crpc"))
                    summary = _clean(m.group("summary") or "")

                    # Default mode: only main BNSS sections (1..531).
                    if not include_subsections:
                        if "(" in bnss_sec:
                            continue
                        num_match = re.match(r"^(\d+)", bnss_sec)
                        if not num_match:
                            continue
                        sec_no = int(num_match.group(1))
                        if sec_no < 1 or sec_no > MAX_BNSS_SECTION:
                            continue

                    current = {
                        "IPC Section": crpc_sec,
                        "IPC Heading": subject,
                        "IPC Descriptions": summary or subject,
                        "BNS Section": bnss_sec,
                        "BNS Heading": subject,
                        "BNS description": summary,
                    }
                    rows.append(current)
                    continue

                # Continuation line: append to current summary.
                if current is None:
                    continue

                # Skip lines that are standalone section tokens but failed strict parse.
                if section_pat.match(line):
                    continue

                extra = _clean(line)
                if not extra:
                    continue

                prev_summary = current.get("BNS description", "")
                current["BNS description"] = _clean(f"{prev_summary} {extra}")
                current["IPC Descriptions"] = current["BNS description"] or current["IPC Heading"]

    return rows


def _normalize_row(row: list[str], col_map: ColMap) -> dict[str, str]:
    bnss_sec = _safe_cell(row, col_map.bnss_sec)
    subject = _safe_cell(row, col_map.subject)
    crpc_sec = _safe_cell(row, col_map.crpc_sec)
    summary = _safe_cell(row, col_map.summary)

    # Keep exact field names used by existing IPC-BNS mapping pipeline.
    # CRPC values are stored in IPC-* keys for schema compatibility.
    ipc_heading = subject
    ipc_desc = summary or subject

    return {
        "IPC Section": crpc_sec,
        "IPC Heading": ipc_heading,
        "IPC Descriptions": ipc_desc,
        "BNS Section": bnss_sec,
        "BNS Heading": subject,
        "BNS description": summary,
    }


def extract_rows(pdf_path: Path, include_subsections: bool = False) -> list[dict[str, str]]:
    rows = _parse_text_rows(pdf_path, include_subsections=include_subsections)

    # Deduplicate by BNSS section, prefer richer summary/description text.
    by_pair: dict[str, dict[str, str]] = {}
    for r in rows:
        key = r["BNS Section"]
        existing = by_pair.get(key)
        if existing is None:
            by_pair[key] = r
            continue

        existing_len = len(existing.get("IPC Descriptions", "")) + len(existing.get("BNS description", ""))
        candidate_len = len(r.get("IPC Descriptions", "")) + len(r.get("BNS description", ""))
        if candidate_len > existing_len:
            by_pair[key] = r

    return sorted(by_pair.values(), key=lambda x: x["BNS Section"])


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(REQUIRED_KEYS))
        writer.writeheader()
        writer.writerows(rows)


def write_jsonl(path: Path, rows: list[dict[str, str]]) -> None:
    # Matches current train_model.py expectation where each row can be loaded
    # as a dict-like payload with exact key names above.
    with path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Extract CRPC-BNSS mapping from a PDF and output rows in the exact "
            "schema used by the current IPC-BNS mapping pipeline."
        )
    )
    parser.add_argument("--pdf", required=True, help="Input CRPC-BNSS mapping PDF path")
    parser.add_argument(
        "--out-jsonl",
        default="crpc_bnss_mapped.jsonl",
        help="Output JSONL file path",
    )
    parser.add_argument(
        "--out-csv",
        default="crpc_bnss_mapped.csv",
        help="Output CSV file path",
    )
    parser.add_argument(
        "--include-subsections",
        action="store_true",
        help="Include subsection rows like 2(1)(a). Default exports only main BNSS sections.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    pdf_path = Path(args.pdf)

    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    rows = extract_rows(pdf_path, include_subsections=args.include_subsections)
    if not rows:
        raise RuntimeError(
            "No mapping rows extracted. Check if the PDF contains detectable tables "
            "with CRPC/BNSS columns."
        )

    out_jsonl = Path(args.out_jsonl)
    out_csv = Path(args.out_csv)

    write_jsonl(out_jsonl, rows)
    write_csv(out_csv, rows)

    print(f"Extracted {len(rows)} mappings")
    print(f"JSONL: {out_jsonl}")
    print(f"CSV:   {out_csv}")


if __name__ == "__main__":
    main()
