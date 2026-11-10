#!/usr/bin/env python3
"""Aranha do site publico do Algorithomus (apenas biblioteca padrao do Python).

Descobre e baixa TODO o conteudo alcancavel do jogo: paginas, estilos,
scripts, imagens, icones de perfil, galeria, audio e video, inclusive
o manifesto oficial de midias (/media-manifest.json), os audios por dia
do diario, os videos, os rabiscos e as mensagens de voz.
Cada arquivo e tentado duas vezes em caso de falha de rede.
"""
import os
import re
import time
import urllib.parse
import urllib.request

ORIGIN = "https://algorithomus.com.br"
DEST = os.environ.get("ALGO_SITE_DEST", "android-app/app/src/main/assets/site")
MANIFEST = os.environ.get("ALGO_MEDIA_MANIFEST", "android-app/tools/media_manifest.txt")
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
                print("[spider] falha (ignorada): %s -> %s" % (url, exc))
                continue
            try:
                save(url, data)
            except Exception as exc:
                print("[spider] falha ao salvar (ignorada): %s -> %s" % (url, exc))
                continue
            path = urllib.parse.urlsplit(url).path.lower()
            ext = os.path.splitext(path)[1]
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
    print("[spider] concluido: %d paginas/texto, %d midias baixadas nesta execucao" % (pages, media))
    print("[spider] EMBUTIDOS NO APK: %d audios, %d videos, %d imagens, %d outros, %d arquivos totais"
          % (counts["audio"], counts["video"], counts["imagem"], counts["outro"], total_files))


if __name__ == "__main__":
    main()
