#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
export ALGO_SITE_DEST="android-app/app/src/main/assets/site"
export ALGO_MEDIA_MANIFEST="android-app/tools/media_manifest.txt"
export ALGO_MIRROR_REPORT="android-app/app/src/main/assets/config/site-mirror-report.json"
mkdir -p "$ALGO_SITE_DEST"
echo "[mirror] crawling official Algorithomus site..."
python3 android-app/tools/spider_site.py || echo "[mirror] WARNING: site crawl failed; existing local assets are preserved."
echo "[mirror] extracting images from supplied PDF..."
python3 android-app/tools/extract_pdf_media.py
echo "[mirror] importing media from historical APKs and companion game repositories..."
python3 android-app/tools/import_legacy_apk_media.py
echo "[mirror] patching native audio lifecycle hooks..."
python3 android-app/tools/patch_native_audio.py
echo "[mirror] auditing every bundled media file and duplicate candidate..."
python3 android-app/tools/audit_media_library.py
echo "[mirror] site files: $(find "$ALGO_SITE_DEST" -type f | wc -l)"
echo "[mirror] media files: $(find android-app/app/src/main/assets/media -type f 2>/dev/null | wc -l)"
