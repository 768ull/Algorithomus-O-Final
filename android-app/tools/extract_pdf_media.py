#!/usr/bin/env python3
"""Extract the PDF's embedded images without recompressing their JPEG streams."""
from __future__ import annotations
import hashlib, json, re, shutil, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PDF = ROOT / "Image to PDF 20261110 18.41.13.pdf"
ASSETS = ROOT / "android-app/app/src/main/assets"
MANIFEST = ASSETS / "config/pdf-media-manifest.json"

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

def main():
    if not PDF.is_file():
        print(f"[pdf-media] PDF not found: {PDF}", file=sys.stderr)
        return 0
    listing = run(["pdfimages", "-list", str(PDF)]).stdout
    meta = {}
    for line in listing.splitlines():
        m = re.match(r"^\s*(\d+)\s+\d+\s+image\s+(\d+)\s+(\d+)", line)
        if m:
            meta[int(m.group(1))] = {"width": int(m.group(2)), "height": int(m.group(3))}
    with tempfile.TemporaryDirectory(prefix="algorithomus-pdf-") as td:
        prefix = str(Path(td) / "asset")
        run(["pdfimages", "-j", str(PDF), prefix])
        extracted = sorted(Path(td).glob("asset-*"))
        if not extracted:
            raise RuntimeError("pdfimages did not extract any image.")
        records = []
        for index, src in enumerate(extracted):
            page = index + 1
            dest = ASSETS / page_group(page) / f"pdf-page-{page:02d}{src.suffix.lower()}"
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dest)
            records.append({
                "sourcePage": page,
                "assetPath": dest.relative_to(ASSETS).as_posix(),
                "sha256": hashlib.sha256(dest.read_bytes()).hexdigest(),
                "bytes": dest.stat().st_size,
                **meta.get(page, {})
            })
        report = {
            "schemaVersion": 1,
            "sourcePdf": PDF.name,
            "sourcePdfSha256": hashlib.sha256(PDF.read_bytes()).hexdigest(),
            "extraction": "pdfimages -j (embedded JPEG streams copied without recompression)",
            "imageCount": len(records),
            "images": records
        }
        MANIFEST.parent.mkdir(parents=True, exist_ok=True)
        MANIFEST.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"[pdf-media] extracted {len(records)} images.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
