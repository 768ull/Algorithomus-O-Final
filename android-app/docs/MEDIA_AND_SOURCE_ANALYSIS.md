# Sources and media analysis

## Inspected sources
- The supplied PDF has 39 pages and 39 embedded JPEG images. The extraction script copies the JPEG streams without recompression and records source page, dimensions, byte count and SHA-256.
- The uploaded `base.apk` is a 187,071-byte Chrome-generated WebAPK. Its manifest package is `org.chromium.webapk.a9b2dd68c59c4c6f1_v2`, with start URL `https://algorithomus.com.br/`. It has 32 ZIP entries and no `assets/` game tree. It is a PWA shortcut/runtime host, not the native game APK. Its archive has V1/JAR entries (`APP.SF/RSA` and `BROWSER.SF/RSA`) and a V2 signing block. The two signers identify Google/WebAPK certificates, so this is not an Algorithomus-owned update key.
- `768ull/Algorithomus-App` contains the prior Android Java hybrid, full website HTML/CSS/JS entry source, media URL manifest, crawler and Wi-Fi fallback patch.
- A successful CI artifact from that repository contained `Algorithomus-v1.9.apk` (23,198,325 bytes). It has 290 ZIP entries, including 256 under `assets/www/`: 115 JS, 48 CSS, 12 HTML, 1 JSON, 57 WebP, 7 PNG, 5 SVG, 9 OGG and 2 MP3. No MP4/WebM were present.
- The v1.9 APK includes local app routes for Calculadora, Cobrinha, Configurações, Galeria, Mensagens, Sem Nome/Rabiscos, Telefone, Tetris and Y. It includes gallery wallpapers and camera photos, profile pictures, app icons and five Rabiscos frames.
- `768ull/https-algorithomus.com.br-` contains Cobrinha/Frutris modules and detailed offline/WebView notes. `768ull/Algorithomus.Arg` contains a WebViewAssetLoader and API bridge implementation that can inform the native/network design.

## PDF page grouping
- Page 1: branding.
- Pages 2–13: app icons.
- Pages 14–20, 23, 28–30, 32–36, 38–39: character illustrations.
- Pages 21, 22, 24–27: scenes.
- Page 31: object/illustration.
- Page 37: emblem.
These are neutral page-based groupings, not claims about the identity of characters or their in-game role.

## Previous hybrid architecture
The v1.9 Java activity loads the official HTTPS site when online. When offline, it keeps the official URL/origin and intercepts requests for the official domain, responding from the APK's local `assets/www/` snapshot. This maintains the website origin while local files substitute network resources. It also applies immersive fullscreen and audio/visibility handling on pause/resume.

The source is preserved in `reference/legacy-v1.9/MainActivity.java`. It is not yet the active Activity in this project.

## Signing evidence and limits
The v1.9 APK's JAR/V1 signature shows the self-signed certificate subject `CN=Algorithomus, OU=App, O=Algorithomus, L=BR, ST=BR, C=BR` using SHA256withRSA, with displayed validity from 2026-10-23 to 2054-03-10. This verifies JAR/V1 signing only; it does not prove V2, V3 or V4 signatures. It also does not provide the private key. Updating an existing installation requires the exact same signing identity; a new key cannot update an APK signed by another key.

## Known missing media
The v1.9 artifact contains no MP4/WebM, although the legacy URL manifest lists two diary videos. The new PDF provides still images, not those videos. Those files need to be recovered separately from the official server or the user's media archive.


## APIs identificadas no snapshot v1.9

As chamadas ao servidor encontradas no JavaScript antigo incluem:

| Recurso | Endpoint observado | Observação offline |
|---|---|---|
| Mensagens | `POST /api/messages/` | Conversas e mensagens dependem de retorno do servidor; não inventar histórico |
| Y | `POST /api/<ação>` | Ações/estado precisam de resposta oficial |
| Diário | `POST /api/diary/<ação>` | Sequência e desbloqueios podem depender do backend |
| Calculadora | `POST /api/calculator-check` | Verificação de códigos depende do backend |
| Wi-Fi | `/api/wifi-check`, `/api/wifi-forget`, `/api/wifi-state`, `/api/wifi-clues` | O JS antigo inclui fallback parcial em localStorage para estado/pistas |
| Mídia | `/api/media` | A resposta pode selecionar um recurso de áudio; exige mapear dados do servidor |

O APK novo incorpora os arquivos estáticos em `assets/site/`, mas o cliente WebView não transforma automaticamente essas rotas de API em dados locais. Sem conexão, essas chamadas ainda podem falhar. O modo online segue encaminhando-as ao domínio oficial.

## Identidade do aplicativo novo

O APK híbrido antigo usa `applicationId=br.com.algorithomus.app`. Para manter esta nova versão independente e instalável ao lado da versão anterior, o módulo novo usa `applicationId=br.com.algorithomus.mobile`, mantendo o namespace/código Java interno separado. Essa identidade deve permanecer fixa nas atualizações deste novo APK.

A keystore histórica não foi recuperada. A identidade de assinatura do APK v1.9 não prova que a chave privada esteja disponível. O novo app precisa de uma keystore própria, protegida fora do GitHub.


## Exhaustive media extraction from previous repositories

The build now imports media from the public archive sources in:
- \`768ull/Algorithomus\`: previous hybrid APK and the V1/V2/V3/V4 ZIP archive (only embedded APK media is extracted; keystores, keys and signature sidecars are never copied).
- \`768ull/https-algorithomus.com.br-\`: Cobrinha and Frutris APKs, plus their three source-repository WebP assets.
- \`768ull/Algorithomus-App\`: prior Java/HTML/CSS/JS snapshot and media URL manifest already retained as source reference.
- The supplied PDF: all embedded JPEG images are extracted without recompression.

The importer only copies media entries. For the main hybrid APK, media from \`assets/www/\` fills missing paths under \`assets/site/\`; an existing live-site file is never overwritten. If a same-path file has different bytes, the legacy version is stored under \`assets/media/legacy-repositories/\`. Other APK drawable/media resources are stored under \`assets/media/legacy-apks/\`.

## Media format and duplicate policy

No conversion or recompression is applied to the original PNG, WebP, JPEG, SVG, OGG, MP3, WAV, MP4/WebM, or font files. The \`config/media-library-manifest.json\` inventory lists the original path, extension, MIME type, byte length and SHA-256.

Exact duplicates and perceptual near-duplicate candidates (8x8 average hash distance <= 2) are reported, never deleted. The PDF's 39 JPEGs remain included even when their artwork resembles an older website/APK asset. The two known visually similar page pairs from the supplied PDF are pages 8/9 (settings icon) and pages 11/12 (calculator icon); they are different JPEG files and both are retained.

## Audio lifecycle behavior

The native Activity calls the patched local \`/js/sound.js\` in online and offline mode. On Android \`onPause\`, it first invokes \`sound.suspendNative()\`, pauses every audio/video element across same-origin frames, and suspends the audio context. It then waits for JavaScript completion before pausing the WebView and its timers. On return, timers are resumed, the page is made visible again, previous media positions are resumed and the current game state is not reloaded.

The final CI step inspects the generated APK ZIP and fails if any file in the media inventory is absent from the package.


## Full Cobrinha and Frutris web-source trees

The media importer also downloads every file under the separate Android modules' `assets/www/` trees in `768ull/https-algorithomus.com.br-`:
- `android/apps/cobrinha/src/main/assets/www/`
- `android/apps/frutris/src/main/assets/www/`

This copies their full HTML/CSS/JavaScript and shared scripts (including game engines, render/input/state modules, game audio logic, ghost-touch and app-theme), plus every image/audio/font/video file present in those source trees. Paths are mapped into `assets/site/`. If a live-site path already exists with different bytes, the alternate source version is retained under `assets/media/legacy-repositories/` instead of overwriting the canonical live asset. The complete module tree remains available for review in that legacy archive.


## Importação integral das árvores web antigas

Além de extrair mídia dos APKs, o build percorre e importa todos os arquivos sob:
- `768ull/Algorithomus-App/app/src/main/assets/www/` (snapshot completo do simulador v1.9);
- `768ull/https-algorithomus.com.br-/android/apps/cobrinha/src/main/assets/www/`;
- `768ull/https-algorithomus.com.br-/android/apps/frutris/src/main/assets/www/`.

Essas árvores contêm arquivos executáveis e de interface, não apenas mídia. O importador guarda HTML, CSS, JavaScript, JSON, SVG, imagens, áudio, fontes e outros arquivos exatamente como baixados. Os arquivos são mapeados para seus caminhos relativos sob `assets/site/`; versões conflitantes são guardadas sob `assets/media/legacy-repositories/`. Duplicatas idênticas são registradas sem multiplicar cópias; nenhum recurso visualmente parecido é eliminado por heurística.
