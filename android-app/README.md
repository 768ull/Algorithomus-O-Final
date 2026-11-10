# Algorithomus para Android

Este é um aplicativo Android independente, com uma Activity Android nativa em Java e o motor WebView do Android para preservar a execução do jogo e a comunicação com o servidor oficial.

## Estado do projeto

**Fundação do APK:** em construção e sendo validada por GitHub Actions.

Já existe:
- Projeto Gradle Android com Kotlin.
- Activity nativa em tela cheia.
- WebView com JavaScript, armazenamento web e AndroidX WebKit.
- Navegação para o endereço oficial por HTTPS.
- Tela local de contingência em caso de falha no carregamento do servidor.
- Estrutura de diretórios preparada para o código do site e para as mídias locais.
- Arte do ícone do aplicativo fornecida pelo proprietário, adaptada para a área segura do ícone Android sem cortar a composição.
- Testes unitários e instrumentados iniciais.
- Script de assinatura V1/V2/V3/V4 e workflow manual de release preparado para usar uma keystore protegida.

O modo offline ainda não contém o simulador jogável. Nesta etapa foram criadas as pastas e a base técnica; o código e as mídias originais serão adicionados posteriormente, conforme combinado.

## Abrir e compilar

Abra a pasta `android-app/` no Android Studio. O workflow do GitHub gera e versiona o Gradle Wrapper na primeira execução.

Depois que `gradlew` estiver presente:

```bash
./gradlew assembleDebug
./gradlew test
```

APK de depuração: `app/build/outputs/apk/debug/`.

## Organização dos arquivos

Consulte [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) e [MEDIA_AND_SOURCE_ANALYSIS.md](docs/MEDIA_AND_SOURCE_ANALYSIS.md). O código Java v1.9 está em `reference/legacy-v1.9/` como material de análise, não como Activity ativa.

## Identidade de atualização e assinatura

O identificador permanente do aplicativo é `br.com.algorithomus.app`. Não o altere depois de distribuir a primeira versão.

A chave de release ainda não foi criada. Use `scripts/create-keystore.sh` localmente uma única vez e mantenha a keystore e suas senhas em cópias seguras fora do repositório. Configure os segredos listados em [signing/README.md](signing/README.md) antes de executar o workflow manual de release.

Não publique uma keystore nem senhas neste repositório ou nesta conversa. Todas as atualizações futuras precisam ser assinadas com a mesma chave de release.


## Biblioteca completa de mídia

Antes de cada APK de depuração, o workflow:
1. espelha os recursos atuais do servidor oficial;
2. extrai todas as imagens JPEG do PDF fornecido;
3. baixa os APKs públicos anteriores de Algorithomus, Cobrinha e Frutris e extrai somente mídia;
4. preenche os caminhos ausentes sem sobrescrever o snapshot atual;
5. calcula hashes e candidatos de duplicata sem excluir arquivos;
6. verifica dentro do APK final todos os arquivos listados no inventário.

Nenhum áudio ou imagem é convertido de formato. O APK preserva OGG/MP3 e PNG/WebP/JPEG/SVG originais. O inventário está em \`app/src/main/assets/config/media-library-manifest.json\`.

## Pausa e retomada do jogo

Ao sair do aplicativo, a Activity nativa suspende o motor de som, pausa áudio e vídeo inclusive nos iframes, e só então congela os timers do WebView. Ao voltar, retoma o estado existente sem recarregar a página. O script nativo usa uma cópia local e compatível de \`js/sound.js\` também quando o jogo está conectado ao servidor oficial.
