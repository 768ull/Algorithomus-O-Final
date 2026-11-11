#!/usr/bin/env python3
"""Media-only extraction from staged historical APKs.

The main branch contains only the extracted media, not the private source APKs.
The temporary extraction branch stages source APKs under tools/private-sources/.
If no staged APK is present, preserve the last committed extraction report.
"""
from __future__ import annotations
import hashlib
import json
import mimetypes
import zipfile
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "android-app/app/src/main/assets"
SITE = ASSETS / "site"
MEDIA = ASSETS / "media"
CONFIG = ASSETS / "config"
LOCAL_APKS = [
    ("cobrinha-apk", ROOT / "android-app/tools/private-sources/Cobrinha.apk"),
    ("frutris-apk", ROOT / "android-app/tools/private-sources/Frutris.apk"),
]
MEDIA_EXTENSIONS = {
    ".png", ".webp", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".bmp", ".avif",
    ".mp3", ".ogg", ".oga", ".wav", ".m4a", ".aac", ".flac", ".opus", ".mid", ".midi",
    ".mp4", ".webm", ".m4v", ".mov", ".3gp",
    ".woff", ".woff2", ".ttf", ".otf"
}
DRAWABLE_XML_PREFIXES = ("res/drawable/", "res/mipmap/")
report = {"schemaVersion": 1, "sources": [], "media": [], "errors": [],
          "policy": "Original bytes retained without recompression; conflicting historical versions are archived."}

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def safe_parts(name: str):
    p = PurePosixPath(name.replace("\\", "/"))
    if p.is_absolute() or any(part in ("", ".", "..") for part in p.parts):
        return None
    return p.parts

def place(data: bytes, source: str, apk_name: str, entry: str,
          preferred: Path, category: str):
    digest = sha(data)
    preferred.parent.mkdir(parents=True, exist_ok=True)
    final = preferred
    action = "copied"
    if final.exists():
        old = final.read_bytes()
        if sha(old) == digest:
            action = "identical-existing-file"
        else:
            final = MEDIA / "legacy-apks" / source / apk_name / Path(*safe_parts(entry))
            final.parent.mkdir(parents=True, exist_ok=True)
            if final.exists():
                if sha(final.read_bytes()) == digest:
                    action = "identical-legacy-copy"
                else:
                    final = final.with_name(final.stem + ".sha-" + digest[:10] + final.suffix)
            if not final.exists():
                final.write_bytes(data)
                action = "preserved-conflicting-version"
    else:
        final.write_bytes(data)
    report["media"].append({
        "source": source, "apk": apk_name, "sourcePath": entry,
        "assetPath": final.relative_to(ASSETS).as_posix(),
        "category": category, "extension": final.suffix.lower(),
        "mimeType": mimetypes.guess_type(final.name)[0] or "application/octet-stream",
        "bytes": len(data), "sha256": digest, "action": action
    })

def extract(source: str, path: Path):
    if not path.is_file():
        print("[legacy-apk] staged source absent: %s" % path.name, flush=True)
        return
    apk_data = path.read_bytes()
    extracted = 0
    with zipfile.ZipFile(path, "r") as apk:
        for info in apk.infolist():
            if info.is_dir():
                continue
            entry = info.filename
            parts = safe_parts(entry)
            if not parts:
                report["errors"].append({"source": source, "path": entry, "error": "unsafe path"})
                continue
            lower = entry.lower()
            ext = PurePosixPath(entry).suffix.lower()
            if ext not in MEDIA_EXTENSIONS and not (
                ext == ".xml" and lower.startswith(DRAWABLE_XML_PREFIXES)
            ):
                continue
            data = apk.read(info)
            if lower.startswith("assets/www/"):
                rel = safe_parts(entry[len("assets/www/"):])
                if not rel:
                    continue
                target = SITE / Path(*rel)
                category = "historical-site-media"
            else:
                target = MEDIA / "legacy-apks" / source / path.name / Path(*parts)
                category = "apk-resource-media"
            place(data, source, path.name, entry, target, category)
            extracted += 1
    report["sources"].append({
        "source": source, "file": path.name, "kind": "APK media-only extraction",
        "bytes": len(apk_data), "sha256": sha(apk_data), "mediaEntries": extracted
    })
    print("[legacy-apk] %s: %d entries extracted" % (path.name, extracted), flush=True)

def main():
    CONFIG.mkdir(parents=True, exist_ok=True)
    imported = 0
    for source, path in LOCAL_APKS:
        if path.is_file():
            extract(source, path)
            imported += 1
    output = CONFIG / "legacy-apk-media-report.json"
    if imported == 0 and output.exists():
        print("[legacy-apk] no private source APKs staged; preserving committed extraction report", flush=True)
        return 0
    report["summary"] = {
        "sourcesProcessed": len(report["sources"]),
        "mediaEntryRecords": len(report["media"]),
        "errors": len(report["errors"]),
        "allCopiedBytesPreservedWithoutReencoding": True,
        "noOriginalMediaWasOverwritten": True
    }
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("[legacy-apk] imported %d entries from %d APKs; errors=%d" % (
        len(report["media"]), len(report["sources"]), len(report["errors"])), flush=True)
    print("[legacy-apk] inventory: %s" % output, flush=True)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
