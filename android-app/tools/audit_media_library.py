#!/usr/bin/env python3
"""Create a complete media inventory and duplicate-candidate report.

This script never deletes or recompresses files. Perceptual matches are only
reported as candidates; all differently encoded files remain packaged.
"""
from __future__ import annotations
import hashlib
import json
import mimetypes
import shutil
from collections import defaultdict, Counter
from itertools import combinations
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "android-app/app/src/main/assets"
OUT = ASSETS / "config/media-library-manifest.json"
IMAGE_EXT = {".png", ".webp", ".jpg", ".jpeg", ".gif", ".bmp", ".avif", ".ico"}
AUDIO_EXT = {".mp3", ".ogg", ".oga", ".wav", ".m4a", ".aac", ".flac", ".opus", ".mid", ".midi"}
VIDEO_EXT = {".mp4", ".webm", ".m4v", ".mov", ".3gp"}
FONT_EXT = {".woff", ".woff2", ".ttf", ".otf"}
MEDIA_EXT = IMAGE_EXT | AUDIO_EXT | VIDEO_EXT | FONT_EXT

def sha_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()

def average_hash(path: Path):
    try:
        with Image.open(path) as src:
            img = ImageOps.exif_transpose(src).convert("L").resize((8, 8), Image.Resampling.LANCZOS)
            values = list(img.getdata())
            middle = sorted(values)[len(values) // 2]
            value = 0
            for pixel in values:
                value = (value << 1) | (1 if pixel >= middle else 0)
            return "%016x" % value
    except Exception:
        return None

def hamming(a: str, b: str) -> int:
    return (int(a, 16) ^ int(b, 16)).bit_count()

def media_type(ext: str) -> str:
    if ext in IMAGE_EXT: return "image"
    if ext in AUDIO_EXT: return "audio"
    if ext in VIDEO_EXT: return "video"
    if ext in FONT_EXT: return "font"
    return "other"

UNICODE_ALIASES = [
    {
        "path": "site/assets/img/Icones/anotações.webp",
        "aliasPath": "site/assets/img/Icones/anotacoes-unicode.webp"
    },
    {
        "path": "site/assets/img/Icones/configurações.webp",
        "aliasPath": "site/assets/img/Icones/configuracoes-unicode.webp"
    }
]

def ensure_unicode_aliases():
    aliases = []
    for item in UNICODE_ALIASES:
        source = ASSETS / item["path"]
        alias = ASSETS / item["aliasPath"]
        if not source.is_file():
            continue
        alias.parent.mkdir(parents=True, exist_ok=True)
        if not alias.exists():
            shutil.copyfile(source, alias)
        aliases.append({
            "originalPath": item["path"],
            "aliasPath": item["aliasPath"],
            "bytes": alias.stat().st_size,
            "sha256": sha_file(alias),
            "reason": "ASCII fallback for Android asset packaging; original filename remains preserved."
        })
    return aliases

def main():
    unicode_aliases = ensure_unicode_aliases()
    records = []
    by_sha = defaultdict(list)
    by_type = Counter()
    image_hashes = []
    for path in sorted(ASSETS.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in MEDIA_EXT:
            continue
        rel = path.relative_to(ASSETS).as_posix()
        ext = path.suffix.lower()
        digest = sha_file(path)
        kind = media_type(ext)
        record = {
            "path": rel,
            "type": kind,
            "extension": ext,
            "mimeType": mimetypes.guess_type(path.name)[0] or "application/octet-stream",
            "bytes": path.stat().st_size,
            "sha256": digest
        }
        if kind == "image":
            ah = average_hash(path)
            if ah:
                record["averageHash8x8"] = ah
                image_hashes.append((rel, digest, ah))
        records.append(record)
        by_sha[(kind, digest)].append(rel)
        by_type[kind] += 1

    exact_groups = [
        {"type": kind, "sha256": digest, "paths": paths}
        for (kind, digest), paths in by_sha.items() if len(paths) > 1
    ]
    candidates = []
    for (path_a, sha_a, hash_a), (path_b, sha_b, hash_b) in combinations(image_hashes, 2):
        if sha_a == sha_b:
            continue
        distance = hamming(hash_a, hash_b)
        if distance <= 2:
            candidates.append({
                "pathA": path_a,
                "pathB": path_b,
                "averageHashDistance": distance,
                "note": "Visual similarity candidate only; both original files are retained."
            })

    pdf_images = [r for r in records if r["path"].startswith("media/") and "/pdf-page-" in r["path"]]
    pdf_pairs = []
    pdf_hashes = {r["path"]: r.get("averageHash8x8") for r in pdf_images}
    for pa, pb in combinations(sorted(pdf_hashes), 2):
        if pdf_hashes[pa] and pdf_hashes[pb]:
            d = hamming(pdf_hashes[pa], pdf_hashes[pb])
            if d <= 2:
                pdf_pairs.append({"pathA": pa, "pathB": pb, "averageHashDistance": d})

    result = {
        "schemaVersion": 1,
        "policy": "Original media files are not deleted, renamed, or re-encoded. Exact duplicates and perceptual candidates are recorded for review only.",
        "counts": {
            "totalMediaFiles": len(records),
            "images": by_type["image"],
            "audio": by_type["audio"],
            "video": by_type["video"],
            "fonts": by_type["font"],
            "exactDuplicateGroups": len(exact_groups),
            "perceptualDuplicateCandidates": len(candidates),
            "pdfPerceptualDuplicatePairs": len(pdf_pairs)
        },
        "exactDuplicateGroups": exact_groups,
        "perceptualDuplicateCandidates": candidates,
        "pdfPerceptualDuplicatePairs": pdf_pairs,
        "files": records
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("[media-audit] files=%d images=%d audio=%d video=%d fonts=%d" % (
        len(records), by_type["image"], by_type["audio"], by_type["video"], by_type["font"]))
    print("[media-audit] exact duplicate groups=%d; perceptual candidates=%d; PDF pairs=%d" % (
        len(exact_groups), len(candidates), len(pdf_pairs)))
    print("[media-audit] inventory: %s" % OUT)

if __name__ == "__main__":
    main()
