"""Extract the supplied marumaru PDF layout; requires pdfplumber.

Preview by default. --write updates extracted-pairs.json and bilingual text
files, while preserving text files that have been edited since extraction.
The reviewed timing alignment is maintained separately.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import unicodedata
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
DIRECTORY = ROOT / "lyrics" / "translations"

def normalise_title(text):
    text = re.sub(r"\s*\([^)]*\)$", "", text)
    return unicodedata.normalize("NFKC", text.replace("+", " ").replace("’", "'")).strip().lower()

def normalise_glyphs(text):
    # Repair compatibility radicals from PDF fonts, preserving punctuation.
    text = "".join(unicodedata.normalize("NFKC", char) if "\u2f00" <= char <= "\u2fdf" else char for char in text)
    for radical, character in {"⻑": "長", "⻘": "青", "⻄": "西", "⻭": "歯", "⺟": "母"}.items():
        text = text.replace(radical, character)
    return text.strip()

def bilingual_text(record):
    return "\n\n".join(pair["original"] + "\n" + pair["translation"] for pair in record["pairs"]) + "\n"

def extract(filename, song_id):
    rows = []
    with pdfplumber.open(filename) as document:
        for page_number, page in enumerate(document.pages, 1):
            groups = []
            for char in sorted(page.chars, key=lambda item: (item["top"], item["x0"])):
                color = char.get("non_stroking_color")
                kind = "translation" if isinstance(color, tuple) and len(color) == 3 and color[1] > 0.4 and color[0] < 0.1 else "original" if abs(char["size"] - 23.4065) < 0.2 else None
                if not kind:
                    continue
                group = next((item for item in reversed(groups) if item["kind"] == kind and abs(item["top"] - char["top"]) < 3), None)
                if group is None:
                    group = {"kind": kind, "top": char["top"], "chars": []}
                    groups.append(group)
                group["chars"].append(char)
            for group in sorted(groups, key=lambda item: item["top"]):
                text = "".join(char["text"] for char in sorted(group["chars"], key=lambda item: item["x0"]))
                rows.append({"kind": group["kind"], "top": group["top"], "page": page_number, "text": normalise_glyphs(text)})
    pairs = []
    current = previous = None
    for row in rows:
        if row["kind"] == "original":
            wrapped = current and previous and previous["kind"] == "original" and previous["page"] == row["page"] and row["top"] - previous["top"] < 30
            if wrapped:
                current["original"] += " " + row["text"]
            else:
                current = {"index": len(pairs), "original": row["text"], "translation": "", "page": row["page"]}
                pairs.append(current)
        else:
            if current is None:
                raise ValueError(f"Translation without original: {filename}")
            current["translation"] += row["text"]
        previous = row
    if not pairs or not any(pair["translation"] for pair in pairs):
        raise ValueError(f"Unsupported PDF layout: {filename}")
    return {"id": song_id, "pdf": filename.name, "sha256": hashlib.sha256(filename.read_bytes()).hexdigest(), "pairs": pairs}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    sources = json.loads((DIRECTORY / "sources.json").read_text(encoding="utf-8"))
    lookup = {normalise_title(song["title"]): song for song in sources["songs"]}
    previous_path = DIRECTORY / "extracted-pairs.json"
    previous = {item["id"]: item for item in json.loads(previous_path.read_text(encoding="utf-8"))} if previous_path.exists() else {}
    records = []
    for filename in sorted(DIRECTORY.glob("*.pdf")):
        title = normalise_title(re.sub(r"^\(歌詞\)", "", filename.stem))
        song = lookup[title]
        record = extract(filename, song["id"])
        records.append(record)
        target = DIRECTORY / song["file"]
        if args.write and target.exists() and target.stat().st_size:
            existing = target.read_text(encoding="utf-8")
            old = previous.get(song["id"])
            if existing != bilingual_text(record) and (not old or existing != bilingual_text(old)):
                raise ValueError(f"Preserving edited text; resolve manually: {target}")
        print(f"{song['id']}: {len(record['pairs'])} original/translation pairs")
    if len(records) != len(sources["songs"]) or len({record["id"] for record in records}) != len(records):
        raise ValueError("Missing or duplicate PDF songs")
    if not args.write:
        print("Preview only; add --write to save extraction results.")
        return
    for record in records:
        song = next(song for song in sources["songs"] if song["id"] == record["id"])
        (DIRECTORY / song["file"]).write_text(bilingual_text(record), encoding="utf-8")
    previous_path.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__":
    main()
