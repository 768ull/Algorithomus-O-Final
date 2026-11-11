#!/usr/bin/env python3
"""Extract every embedded image from every supplied root-level PDF.

Exact byte duplicates are mapped to one canonical asset path. Visually similar
but differently encoded images are never removed. Original PDFs are untouched.
"""
from __future__ import annotations
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "android-app/app/src/main/assets"
MANIFEST = ASSETS / "config/pdf-media-manifest.json"
PRIMARY_PDF = "Image to PDF 20261110 18.41.13.pdf"
IMAGE_EXT = {".png", ".webp", ".jpg", ".jpeg", ".gif", ".bmp", ".avif", ".ico"}

def run(args):
    return subprocess.run(args, check=True, capture_output=True, text=True)

def page_group(page: int) -> str:
    if page in (1, 37): return "media/images/branding"
    if 2 <= page <= 13: return "media/app-icons"
    if page in (21, 22, 24, 25, 26, 27): return "media/images/scenes"
    if page == 31: return "media/images/objects"
    if 14 <= page <= 20 or page == 23 or 28 <= page <= 30 or 32 <= page <= 36 or 38 <= page <= 39:
        return "media/images/characters"
    return "media/images/other"

def slugify(value: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9._-]+", "-", value).strip("-._").lower()
    return value or "document"

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def existing_images():
    found = {}
    for path in ASSETS.rglob("*"):
        if path.is_file() and path.suffix.lower() in IMAGE_EXT:
            try:
                found[sha(path.read_bytes())] = path.relative_to(ASSETS).as_posix()
            except OSError:
                pass
    return found

def main():
    pdfs = sorted(ROOT.glob("*.pdf"))
    if not pdfs:
        print("[pdf-media] no root-level PDFs found")
        return 0

    seen = existing_images()
    sources = []
    all_images = []
    new_unique = 0
    duplicate_entries = 0

    for pdf in pdfs:
        print("[pdf-media] extracting: %s" % pdf.name, flush=True)
        listing = run(["pdfimages", "-list", str(pdf)]).stdout
        rows = []
        for line in listing.splitlines():
            match = re.match(r"^\s*(\d+)\s+\d+\s+image\s+(\d+)\s+(\d+)", line)
            if match:
                rows.append({
                    "sourcePage": int(match.group(1)),
                    "width": int(match.group(2)),
                    "height": int(match.group(3))
                })

        with tempfile.TemporaryDirectory(prefix="algorithomus-pdf-") as td:
            prefix = str(Path(td) / "asset")
            run(["pdfimages", "-j", str(pdf), prefix])
            extracted = sorted(Path(td).glob("asset-*"))
            if not extracted:
                sources.append({
                    "sourcePdf": pdf.name,
                    "sourcePdfSha256": sha(pdf.read_bytes()),
                    "imageCount": 0,
                    "warning": "No embedded images extracted"
                })
                continue

            source_records = []
            slug = slugify(pdf.stem)
            for index, src in enumerate(extracted):
                row = rows[index] if index < len(rows) else {}
                page = row.get("sourcePage", index + 1)
                raw = src.read_bytes()
                digest = sha(raw)
                suffix = src.suffix.lower() or ".bin"

                if pdf.name == PRIMARY_PDF:
                    relative = Path(page_group(page)) / ("pdf-page-%02d%s" % (page, suffix))
                else:
                    relative = Path("media/pdf") / slug / ("page-%03d-image-%03d%s" % (page, index + 1, suffix))

                destination = ASSETS / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                duplicate_of = seen.get(digest)
                if duplicate_of:
                    asset_path = duplicate_of
                    duplicate_entries += 1
                else:
                    if destination.exists() and sha(destination.read_bytes()) != digest:
                        destination = destination.with_name(destination.stem + ".sha-" + digest[:10] + destination.suffix)
                    destination.write_bytes(raw)
                    asset_path = destination.relative_to(ASSETS).as_posix()
                    seen[digest] = asset_path
                    new_unique += 1

                record = {
                    "sourcePdf": pdf.name,
                    "sourcePage": page,
                    "sourceImageIndex": index + 1,
                    "assetPath": asset_path,
                    "sha256": digest,
                    "bytes": len(raw),
                    **({"width": row["width"], "height": row["height"]} if "width" in row else {}),
                }
                if duplicate_of and duplicate_of != asset_path:
                    record["duplicateOf"] = duplicate_of
                source_records.append(record)
                all_images.append(record)

            sources.append({
                "sourcePdf": pdf.name,
                "sourcePdfSha256": sha(pdf.read_bytes()),
                "imageCount": len(source_records),
                "images": source_records
            })
            print("[pdf-media] %s: %d images" % (pdf.name, len(source_records)), flush=True)

    report = {
        "schemaVersion": 2,
        "extraction": "pdfimages -j; embedded image streams copied without recompression",
        "policy": "Exact byte duplicates share a canonical asset path; visually similar but different files are retained.",
        "pdfCount": len(pdfs),
        "imageCount": len(all_images),
        "newUniqueImageFiles": new_unique,
        "exactDuplicateEntries": duplicate_entries,
        "sources": sources,
        "images": all_images
    }
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("[pdf-media] PDFs=%d image entries=%d new unique files=%d exact duplicates=%d" % (
        len(pdfs), len(all_images), new_unique, duplicate_entries))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
