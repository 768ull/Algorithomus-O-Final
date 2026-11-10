#!/usr/bin/env python3
"""Verify that every inventoried media file is packaged inside the APK."""
import json
import sys
import zipfile
from pathlib import Path

def main():
    if len(sys.argv) != 2:
        print("usage: verify_apk_media.py app-debug.apk", file=sys.stderr)
        return 2
    apk = Path(sys.argv[1])
    with zipfile.ZipFile(apk) as z:
        names = set(z.namelist())
        manifest_path = "assets/config/media-library-manifest.json"
        if manifest_path not in names:
            print("[apk-media-check] inventory missing from APK", file=sys.stderr)
            return 1
        manifest = json.loads(z.read(manifest_path).decode("utf-8"))
        missing = []
        for record in manifest.get("files", []):
            entry = "assets/" + record["path"]
            if entry not in names:
                missing.append(entry)
        if missing:
            print("[apk-media-check] missing %d media files:" % len(missing), file=sys.stderr)
            for item in missing[:100]: print(item, file=sys.stderr)
            return 1
        audio = [r for r in manifest["files"] if r["type"] == "audio"]
        images = [r for r in manifest["files"] if r["type"] == "image"]
        videos = [r for r in manifest["files"] if r["type"] == "video"]
        sound = "assets/site/js/sound.js"
        if sound not in names or b"suspendNative" not in z.read(sound):
            print("[apk-media-check] patched sound.js missing from APK", file=sys.stderr)
            return 1
        print("[apk-media-check] PASS: %d media files present (images=%d audio=%d video=%d)" % (
            len(manifest["files"]), len(images), len(audio), len(videos)))
        print("[apk-media-check] APK size: %d bytes" % apk.stat().st_size)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
