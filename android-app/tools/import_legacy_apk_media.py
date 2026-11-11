#!/usr/bin/env python3
"""Import media from the user's previous public Algorithomus APK repositories.

The APKs are never installed or executed. Only image, audio, video, font and
related media entries are copied. Existing live-site assets are never overwritten.
Exact hash collisions are recorded; conflicting legacy versions are preserved
under assets/media/legacy-repositories/.
"""
from __future__ import annotations
import hashlib
import io
import json
import os
import shutil
import sys
import time
import urllib.request
import zipfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "android-app/app/src/main/assets"
SITE = ASSETS / "site"
MEDIA = ASSETS / "media"
CONFIG = ASSETS / "config"
TEMP = ROOT / ".media-import-tmp"
MEDIA_SUFFIXES = {
    ".png", ".webp", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".bmp", ".avif",
    ".mp3", ".ogg", ".oga", ".wav", ".m4a", ".aac", ".flac", ".opus", ".mid", ".midi",
    ".mp4", ".webm", ".m4v", ".mov", ".3gp",
    ".woff", ".woff2", ".ttf", ".otf"
}
DRAWABLE_DIRS = ("res/drawable", "res/mipmap", "res/raw", "res/font")
UA = "Mozilla/5.0 (compatible; AlgorithomusMediaImporter/1.0)"
SOURCES = [
    ("algorithomus-hybrid-apk", "768ull/Algorithomus", "algorithomus_offline_hibrido_assinado.apk"),
    ("algorithomus-v1-v2-v3-v4-archive", "768ull/Algorithomus", "algorithomus_assinado_V1_V2_V3_V4.zip"),
    ("cobrinha-apk", "768ull/https-algorithomus.com.br-", "originals/apk/Cobrinha.apk"),
    ("frutris-apk", "768ull/https-algorithomus.com.br-", "originals/apk/Frutris.apk")
]
SOURCE_TREE_PREFIXES = [
    ("algorithomus-app-v1.9-web-tree", "768ull/Algorithomus-App", "app/src/main/assets/www/"),
    ("cobrinha-full-web-module", "768ull/https-algorithomus.com.br-", "android/apps/cobrinha/src/main/assets/www/"),
    ("frutris-full-web-module", "768ull/https-algorithomus.com.br-", "android/apps/frutris/src/main/assets/www/")
]
report = {"schemaVersion": 1, "sources": [], "media": [], "errors": []}

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def safe_parts(name: str):
    p = PurePosixPath(name.replace("\\", "/"))
    if p.is_absolute() or any(part in ("", ".", "..") for part in p.parts):
        return None
    return p.parts

def download(url: str, accept: str = "application/vnd.github+json") -> bytes:
    """Download private-repository content through the authenticated GitHub API."""
    token = os.environ.get("LEGACY_REPOS_TOKEN", "").strip()
    if not token:
        raise RuntimeError("LEGACY_REPOS_TOKEN is not configured; add a fine-grained PAT with read access to the three private source repositories.")
    last = None
    for attempt in range(2):
        try:
            headers = {
                "User-Agent": UA,
                "Authorization": "Bearer " + token,
                "Accept": accept,
                "X-GitHub-Api-Version": "2022-11-28"
            }
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=120) as response:
                return response.read()
        except Exception as exc:
            last = exc
            if attempt == 0:
                time.sleep(1)
    raise last


def contents_api_url(repository: str, path: str) -> str:
    from urllib.parse import quote
    return "https://api.github.com/repos/%s/contents/%s?ref=main" % (
        repository, quote(path, safe="/"))

def is_drawable_resource(name: str) -> bool:
    n = name.lower()
    return any(n.startswith(prefix) for prefix in DRAWABLE_DIRS)

def preserve_file(data: bytes, source: str, archive_path: str, destination: Path, category: str):
    digest = sha(data)
    destination.parent.mkdir(parents=True, exist_ok=True)
    action = "copied"
    final = destination
    if final.exists():
        current = sha(final.read_bytes())
        if current == digest:
            action = "identical-existing-file"
        else:
            safe_source = source.replace("/", "-")
            safe_rel = Path(*safe_parts(archive_path))
            final = MEDIA / "legacy-repositories" / safe_source / safe_rel
            final.parent.mkdir(parents=True, exist_ok=True)
            if final.exists() and sha(final.read_bytes()) != digest:
                final = final.with_name(final.stem + ".sha-" + digest[:10] + final.suffix)
            if final.exists() and sha(final.read_bytes()) == digest:
                action = "identical-legacy-copy"
            else:
                action = "preserved-conflicting-version"
                final.write_bytes(data)
    else:
        final.write_bytes(data)
    report["media"].append({
        "source": source,
        "sourcePath": archive_path,
        "assetPath": final.relative_to(ASSETS).as_posix(),
        "category": category,
        "bytes": len(data),
        "sha256": digest,
        "action": action
    })

def process_apk(data: bytes, source: str, apk_name: str):
    try:
        apk = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile:
        report["errors"].append({"source": source, "file": apk_name, "error": "APK payload was not a ZIP archive"})
        return
    count = 0
    for info in apk.infolist():
        if info.is_dir():
            continue
        name = info.filename
        parts = safe_parts(name)
        if not parts:
            continue
        low = name.lower()
        suffix = PurePosixPath(name).suffix.lower()
        if suffix not in MEDIA_SUFFIXES and not (suffix == ".xml" and is_drawable_resource(name)):
            continue
        try:
            data_entry = apk.read(info)
        except Exception as exc:
            report["errors"].append({"source": source, "file": name, "error": "read: " + str(exc)})
            continue
        if name.startswith("assets/www/"):
            rel = name[len("assets/www/"):]
            target = SITE / Path(*safe_parts(rel))
            preserve_file(data_entry, source + "/" + apk_name, name, target, "website-media")
        else:
            rel = Path(*parts)
            target = MEDIA / "legacy-apks" / source / apk_name / rel
            preserve_file(data_entry, source + "/" + apk_name, name, target, "apk-resource-media")
        count += 1
    report["sources"].append({
        "source": source,
        "file": apk_name,
        "kind": "APK",
        "bytes": len(data),
        "sha256": sha(data),
        "mediaEntries": count
    })

def process_download(source: str, repository: str, path: str):
    url = contents_api_url(repository, path)
    try:
        data = download(url, "application/vnd.github.raw")
    except Exception as exc:
        report["errors"].append({"source": source, "repository": repository, "path": path, "error": str(exc)})
        print("[legacy-media] source unavailable: %s: %s" % (source, exc), flush=True)
        return
    filename = path.rsplit("/", 1)[-1]
    if path.lower().endswith(".apk"):
        process_apk(data, source, filename)
        return
    try:
        outer = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile:
        report["errors"].append({"source": source, "repository": repository, "path": path, "error": "ZIP archive was invalid"})
        return
    entries = [i for i in outer.infolist() if not i.is_dir()]
    report["sources"].append({
        "source": source, "repository": repository, "file": filename, "kind": "ZIP",
        "bytes": len(data), "sha256": sha(data),
        "entries": [i.filename for i in entries if i.filename.lower().endswith((".apk", ".idsig"))]
    })
    for info in entries:
        n = info.filename.lower()
        if n.endswith((".jks", ".keystore", ".pem", ".key", ".p12", ".pfx", ".idsig")):
            continue
        if n.endswith(".apk"):
            process_apk(outer.read(info), source + "-embedded", info.filename)

def import_complete_game_source_trees():
    """Import every file from all historical site/game assets/www source trees.

    Downloads the small HTML/CSS/JS/media trees concurrently. Original bytes
    are copied as-is; collisions are archived and never silently overwritten.
    """
    for label, repository, prefix in SOURCE_TREE_PREFIXES:
        tree_api = "https://api.github.com/repos/%s/git/trees/main?recursive=1" % repository
        raw_root = "https://raw.githubusercontent.com/%s/main/" % repository
        print("[legacy-media] listing source tree: %s" % label, flush=True)
        try:
            tree_data = json.loads(download(tree_api).decode("utf-8"))
        except Exception as exc:
            report["errors"].append({"source": label, "url": tree_api, "error": str(exc)})
            print("[legacy-media] source tree unavailable: %s: %s" % (label, exc), flush=True)
            continue
        tree = tree_data.get("tree", [])
        if tree_data.get("truncated"):
            report["errors"].append({"source": label, "error": "GitHub tree API returned a truncated tree"})
        selected = [item for item in tree if item.get("type") == "blob" and item.get("path", "").startswith(prefix)]
        tasks = []
        with ThreadPoolExecutor(max_workers=8) as pool:
            for item in selected:
                source_path = item["path"]
                relative = source_path[len(prefix):]
                if not safe_parts(relative):
                    report["errors"].append({"source": label, "file": source_path, "error": "unsafe relative path"})
                    continue
                url = contents_api_url(repository, source_path)
                tasks.append((item, pool.submit(download, url, "application/vnd.github.raw"), url))
            copied = 0
            for item, future, url in tasks:
                source_path = item["path"]
                relative = source_path[len(prefix):]
                try:
                    data = future.result()
                    target = SITE / Path(*safe_parts(relative))
                    preserve_file(data, label, source_path, target, "complete-source-tree-file")
                    copied += 1
                except Exception as exc:
                    report["errors"].append({"source": label, "file": source_path, "url": url, "error": str(exc)})
                    print("[legacy-media] source file unavailable: %s: %s" % (source_path, exc), flush=True)
        report["sources"].append({
            "source": label,
            "repository": repository,
            "sourceTreePrefix": prefix,
            "kind": "complete-assets-www-source-tree",
            "filesFound": len(selected),
            "filesDownloaded": copied
        })
        print("[legacy-media] %s: %d/%d files imported" % (label, copied, len(selected)), flush=True)

def main():
    TEMP.mkdir(parents=True, exist_ok=True)
    for source, repository, path in SOURCES:
        print("[legacy-media] importing archive source: %s" % source, flush=True)
        process_download(source, repository, path)
    import_complete_game_source_trees()
    CONFIG.mkdir(parents=True, exist_ok=True)
    report["summary"] = {
        "mediaEntryRecords": len(report["media"]),
        "sourcesProcessed": len(report["sources"]),
        "sourceErrors": len(report["errors"]),
        "noOriginalMediaWasOverwritten": True,
        "allCopiedBytesPreservedWithoutReencoding": True
    }
    out = CONFIG / "legacy-apk-media-report.json"
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("[legacy-media] extracted media entries: %d" % len(report["media"]))
    print("[legacy-media] sources processed: %d; errors: %d" % (len(report["sources"]), len(report["errors"])))
    print("[legacy-media] inventory: %s" % out)

if __name__ == "__main__":
    main()
