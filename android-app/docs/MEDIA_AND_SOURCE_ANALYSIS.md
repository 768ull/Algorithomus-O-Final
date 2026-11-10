# Sources and media analysis

## Inspected sources
- The supplied PDF has 39 pages and 39 embedded JPEG images. The extraction script copies the JPEG streams without recompression and records source page, dimensions, byte count and SHA-256.
- The uploaded `base.apk` is a 187,071-byte Chrome-generated WebAPK. Its manifest package is `org.chromium.webapk.a9b2dd68c59c4c6f1_v2`, with start URL `https://algorithomus.com.br/`. It has 32 ZIP entries and no `assets/` game tree. It is a PWA shortcut/runtime host, not the native game APK.
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
