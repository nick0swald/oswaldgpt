#!/usr/bin/env python3
"""Extract Nova antwoordenboeken to compact JSON for OswaldGPT (server-only).

Usage:
  python3 scripts/extract-nova-books.py           # from PDFs in attachments/
  python3 scripts/extract-nova-books.py --retag   # recompute h/s in existing JSON

Hoofdstuk/paragraaf come ONLY from a page's running header (first lines,
uppercase "HOOFDSTUK n" / "PARAGRAAF n"). Body text such as "hoofdstuk 12
Elektriciteit" in the Examentraining or "paragraaf 3" in a practicum must not
move pages into another chapter. Pages without such a header (chapter openers,
Examentraining, Vaardigheden, register) get h/s = null.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

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

HOOFDSTUK = re.compile(r"HOOFDSTUK\s+(\d+)\b")
PARAGRAAF = re.compile(r"PARAGRAAF\s+(\d+)\b")
HEADER_LINES = 4


def section_of(text: str) -> tuple[int | None, int | None]:
    """(hoofdstuk, paragraaf) from the page's running header, else (None, None)."""
    head = "\n".join(text.split("\n")[:HEADER_LINES])
    h = HOOFDSTUK.search(head)
    if not h:
        return None, None
    p = PARAGRAAF.search(head)
    return int(h.group(1)), (int(p.group(1)) if p else None)
SPACE = re.compile(r"[ \t]+\n")
MULTI = re.compile(r"\n{3,}")


def clean(text: str) -> str:
    text = text.replace("\u00ad", "").replace("\ufeff", "")
    text = SPACE.sub("\n", text)
    text = MULTI.sub("\n\n", text)
    return text.strip()


def extract_book(spec: dict) -> dict:
    import fitz  # PyMuPDF; only needed when extracting from PDFs

    path = ATTACH / spec["file"]
    if not path.exists():
        raise FileNotFoundError(path)
    doc = fitz.open(str(path))
    pages = []
    seen_chapter = False
    for i, page in enumerate(doc):
        raw = page.get_text("text") or ""
        text = clean(raw)
        if len(text) < 60:
            continue
        chapter, paragraph = section_of(text)
        seen_chapter = seen_chapter or chapter is not None
        # Skip front matter before the first chapter (covers, inhoud).
        if not seen_chapter:
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


def retag() -> None:
    """Recompute h/s for the committed JSON without needing the PDFs."""
    for spec in BOOKS:
        dest = OUT / f"{spec['id']}.json"
        data = json.loads(dest.read_text(encoding="utf-8"))
        changed = 0
        for page in data["pages"]:
            h, s = section_of(page["t"])
            if (page["h"], page["s"]) != (h, s):
                changed += 1
            page["h"], page["s"] = h, s
        dest.write_text(
            json.dumps(data, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        print(f"{spec['id']}: retagged {changed} pages")


def main() -> None:
    if "--retag" in sys.argv:
        retag()
        return
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
