#!/usr/bin/env python3
"""Aranha do site publico do Algorithomus (apenas biblioteca padrao do Python).

Descobre e baixa TODO o conteudo alcancavel do jogo: paginas, estilos,
scripts, imagens, icones de perfil, galeria, audio e video, inclusive
o manifesto oficial de midias (/media-manifest.json), os audios por dia
do diario, os videos, os rabiscos e as mensagens de voz.
Cada arquivo e tentado duas vezes em caso de falha de rede.
"""
import hashlib
import json
import os
import re
import time
from datetime import datetime, timezone
import urllib.parse
import urllib.request

ORIGIN = "https://algorithomus.com.br"
DEST = os.environ.get("ALGO_SITE_DEST", "android-app/app/src/main/assets/site")
MANIFEST = os.environ.get("ALGO_MEDIA_MANIFEST", "android-app/tools/media_manifest.txt")
REPORT = os.environ.get("ALGO_MIRROR_REPORT", "android-app/app/src/main/assets/config/site-mirror-report.json")
UA = ("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36")

EXTS = (".html", ".css", ".js", ".json", ".webp", ".png", ".jpg", ".jpeg",
        ".gif", ".svg", ".ico", ".mp3", ".ogg", ".oga", ".wav", ".m4a",
        ".aac", ".flac", ".webm", ".mp4", ".woff", ".woff2", ".ttf",
        ".otf", ".vtt", ".txt")
TEXT_EXTS = (".html", ".css", ".js", ".json", ".txt", ".svg")
AUDIO_EXTS = (".mp3", ".ogg", ".oga", ".wav", ".m4a", ".aac", ".flac")
VIDEO_EXTS = (".webm", ".mp4")
IMG_EXTS = (".webp", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico")

# Midia que o jogo so baixa quando o aparelho nao suporta OGG. O WebView
# do Android suporta Vorbis e Opus nativamente, portanto esses arquivos
# nunca sao usados no aplicativo e sao ignorados para manter o APK leve.
SKIP = ("audio-fallback/",)


def normalize(url, base):
    url = url.strip().strip("'\"")
    if not url or url.startswith(("#", "data:", "javascript:", "mailto:",
                                   "tel:", "blob:", "about:")):
        return None
    try:
        absu = urllib.parse.urljoin(base, url)
    except ValueError:
        return None
    p = urllib.parse.urlsplit(absu)
    if p.scheme not in ("http", "https"):
        return None
    if p.netloc not in ("algorithomus.com.br", "www.algorithomus.com.br"):
        return None
    decoded_path = urllib.parse.unquote(p.path)
    if any(part in (".", "..") for part in decoded_path.split("/")):
        return None
    path = urllib.parse.quote(p.path, safe="/%")
    if any(s in path for s in SKIP):
        return None
    return urllib.parse.urlunsplit(("https", "algorithomus.com.br",
                                     path, p.query, ""))


def qualifies(absu):
    path = urllib.parse.urlsplit(absu).path.lower()
    if path in ("", "/") or path.endswith("/"):
        return True
    return path.endswith(EXTS)


def local_path(absu):
    path = urllib.parse.unquote(urllib.parse.urlsplit(absu).path)
    if path in ("", "/"):
        path = "index.html"
    elif path.endswith("/"):
        path += "index.html"
    return os.path.join(DEST, path.lstrip("/"))


def fetch(absu):
    last = None
    for attempt in (1, 2):
        try:
            req = urllib.request.Request(absu, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read(), resp.headers.get("Content-Type", "")
        except Exception as exc:
            last = exc
            if attempt == 1:
                time.sleep(0.5)
    raise last


def save(absu, data):
    lp = local_path(absu)
    os.makedirs(os.path.dirname(lp), exist_ok=True)
    with open(lp, "wb") as handle:
        handle.write(data)


ATTR_RE = re.compile(
    r"""(?is)(?:src|href|data-src|data-href|poster|source)\s*[:=]\s*["']([^"']+)["']""")
LITERAL_RE = re.compile(
    r"""["']([^"'\s]{3,256}?\.(?:html|css|js|json|webp|png|jpe?g|gif|svg|ico|mp3|ogg|oga|wav|m4a|aac|flac|webm|mp4|woff2?|ttf|otf|vtt))["']""")


def extract(text, base, seen, queue):
    for match in ATTR_RE.findall(text):
        u = normalize(match, base)
        if u and qualifies(u) and u not in seen and u not in queue:
            queue.append(u)
    for match in LITERAL_RE.findall(text):
        u = normalize(match, base)
        if u and qualifies(u) and u not in seen and u not in queue:
            queue.append(u)


def count_by_ext():
    counts = {"audio": 0, "video": 0, "imagem": 0, "outro": 0}
    for root, _dirs, files in os.walk(DEST):
        for name in files:
            ext = os.path.splitext(name)[1].lower()
            if ext in AUDIO_EXTS:
                counts["audio"] += 1
            elif ext in VIDEO_EXTS:
                counts["video"] += 1
            elif ext in IMG_EXTS:
                counts["imagem"] += 1
            else:
                counts["outro"] += 1
    return counts


def main():
    seeds = []
    if os.path.exists(MANIFEST):
        with open(MANIFEST, encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if line and not line.startswith("#"):
                    u = normalize(line, ORIGIN) or line
                    if u not in seeds:
                        seeds.append(u)
    if ORIGIN + "/" not in seeds:
        seeds.insert(0, ORIGIN + "/")

    seen = set()
    queue = list(seeds)
    media = 0
    pages = 0
    downloaded = []
    failed = []

    for pass_num in (1, 2, 3, 4, 5):
        batch = [u for u in queue if u not in seen]
        queue = []
        print("[spider] passada %d: %d URLs" % (pass_num, len(batch)))
        if not batch:
            break
        for url in batch:
            seen.add(url)
            try:
                data, ctype = fetch(url)
            except Exception as exc:
                parts = urllib.parse.urlsplit(url)
                safe_url = urllib.parse.urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))
                failed.append({"url": safe_url, "reason": str(exc)})
                print("[spider] falha (ignorada): %s -> %s" % (safe_url, exc))
                continue
            try:
                save(url, data)
            except Exception as exc:
                parts = urllib.parse.urlsplit(url)
                safe_url = urllib.parse.urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))
                failed.append({"url": safe_url, "reason": "save: " + str(exc)})
                print("[spider] falha ao salvar (ignorada): %s -> %s" % (safe_url, exc))
                continue
            path = urllib.parse.urlsplit(url).path.lower()
            ext = os.path.splitext(path)[1]
            local_file = local_path(url)
            parts = urllib.parse.urlsplit(url)
            safe_url = urllib.parse.urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))
            downloaded.append({
                "url": safe_url,
                "path": os.path.relpath(local_file, DEST).replace(os.sep, "/"),
                "bytes": len(data),
                "sha256": hashlib.sha256(data).hexdigest(),
                "contentType": ctype,
                "extension": ext
            })
            if ext in TEXT_EXTS or path.endswith("/"):
                pages += 1
                try:
                    text = data.decode("utf-8", "replace")
                except Exception:
                    continue
                extract(text, url, seen, queue)
            else:
                media += 1
                print("[spider] midia embutida: %s (%d bytes)" % (url, len(data)))
            time.sleep(0.1)

    counts = count_by_ext()
    total_files = sum(counts.values())
    report = {
        "schemaVersion": 1,
        "origin": ORIGIN,
        "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
        "pagesAndTextDownloaded": pages,
        "mediaDownloadedThisRun": media,
        "bundledFileCountsByType": counts,
        "bundledFileCount": total_files,
        "downloaded": downloaded,
        "missingOrFailed": failed
    }
    os.makedirs(os.path.dirname(REPORT), exist_ok=True)
    with open(REPORT, "w", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print("[spider] concluido: %d paginas/texto, %d midias baixadas nesta execucao" % (pages, media))
    print("[spider] EMBUTIDOS NO APK: %d audios, %d videos, %d imagens, %d outros, %d arquivos totais"
          % (counts["audio"], counts["video"], counts["imagem"], counts["outro"], total_files))
    print("[spider] urls sem arquivo local: %d; inventario: %s" % (len(failed), REPORT))


if __name__ == "__main__":
    main()
