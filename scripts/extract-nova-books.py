#!/usr/bin/env python3
"""Extract Nova antwoordenboeken to compact JSON for OswaldGPT (server-only)."""

from __future__ import annotations

import json
import re
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "lib" / "nova-books"
ATTACH = ROOT / "attachments"

BOOKS = [
    {
        "file": "NOVA_Nask1_3GT_AWB_deel_A.pdf",
        "id": "gt3-a",
        "series": "gt3",
        "part": "A",
        "book": "Nova Nask 1, 3 VMBO-GT deel A",
    },
    {
        "file": "NOVA_Nask1_3GT_AWB_deel_B.pdf",
        "id": "gt3-b",
        "series": "gt3",
        "part": "B",
        "book": "Nova Nask 1, 3 VMBO-GT deel B",
    },
    {
        "file": "Nova_Nask1_4GT_antwoordenboek_A  (2).pdf",
        "id": "gt4-a",
        "series": "gt4",
        "part": "A",
        "book": "Nova Nask 1, 4 VMBO-GT deel A",
    },
    {
        "file": "Nova_Nask1_4GT_antwoordenboek_B  (3).pdf",
        "id": "gt4-b",
        "series": "gt4",
        "part": "B",
        "book": "Nova Nask 1, 4 VMBO-GT deel B",
    },
    {
        "file": "Nova NaSk 1-2 vmbo-kgt Antwoordenboek deel A (2).pdf",
        "id": "kgt12-a",
        "series": "kgt12",
        "part": "A",
        "book": "Nova NaSk 1|2 VMBO-KGT deel A",
    },
    {
        "file": "Nova NaSk 1-2 vmbo-kgt Antwoordenboek deel B (1).pdf",
        "id": "kgt12-b",
        "series": "kgt12",
        "part": "B",
        "book": "Nova NaSk 1|2 VMBO-KGT deel B",
    },
]

HOOFDSTUK = re.compile(r"HOOFDSTUK\s+(\d+)\b", re.I)
PARAGRAAF = re.compile(r"PARAGRAAF\s+(\d+)\b", re.I)
SPACE = re.compile(r"[ \t]+\n")
MULTI = re.compile(r"\n{3,}")


def clean(text: str) -> str:
    text = text.replace("\u00ad", "").replace("\ufeff", "")
    text = SPACE.sub("\n", text)
    text = MULTI.sub("\n\n", text)
    return text.strip()


def extract_book(spec: dict) -> dict:
    path = ATTACH / spec["file"]
    if not path.exists():
        raise FileNotFoundError(path)
    doc = fitz.open(str(path))
    pages = []
    chapter = None
    paragraph = None
    for i, page in enumerate(doc):
        raw = page.get_text("text") or ""
        text = clean(raw)
        if len(text) < 60:
            continue
        h = HOOFDSTUK.search(text)
        if h:
            chapter = int(h.group(1))
            paragraph = None
        p = PARAGRAAF.search(text)
        if p:
            paragraph = int(p.group(1))
        # Skip front matter without a chapter yet (covers, inhoud).
        if chapter is None:
            continue
        pages.append({"p": i + 1, "h": chapter, "s": paragraph, "t": text})
    doc.close()
    return {
        "id": spec["id"],
        "series": spec["series"],
        "part": spec["part"],
        "book": spec["book"],
        "pages": pages,
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    index = []
    for spec in BOOKS:
        data = extract_book(spec)
        dest = OUT / f"{spec['id']}.json"
        dest.write_text(
            json.dumps(data, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        chars = sum(len(p["t"]) for p in data["pages"])
        print(
            f"{spec['id']}: {len(data['pages'])} pages, {chars} chars -> {dest.name} ({dest.stat().st_size // 1024} KB)"
        )
        index.append(
            {
                "id": spec["id"],
                "series": spec["series"],
                "part": spec["part"],
                "book": spec["book"],
                "pages": len(data["pages"]),
                "chars": chars,
            }
        )
    (OUT / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
