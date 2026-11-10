# Algorithomus — projeto Android

Este repositório preserva os documentos originais recebidos e contém, em `android-app/`, um aplicativo Android híbrido independente.

- [Projeto Android](android-app/)
- [Análise das fontes, mídia e APIs](android-app/docs/MEDIA_AND_SOURCE_ANALYSIS.md)
- [Código de referência do híbrido v1.9](android-app/reference/legacy-v1.9/)
- [Workflow de APK de depuração](.github/workflows/android-app.yml)
- [Workflow de release assinado](.github/workflows/android-release.yml)

## Construir

Abra `android-app/` no Android Studio ou execute:

```bash
cd android-app
./gradlew assembleDebug
./gradlew test
```

O workflow do GitHub também espelha o conteúdo estático público do site, extrai as imagens incorporadas ao PDF de mídia e gera um APK de depuração como artefato.

## Estado importante

O WebView usa o servidor oficial quando está online e pode servir do APK o snapshot estático de HTML/CSS/JavaScript/mídia quando offline. As APIs do servidor (mensagens, diário, Y, calculadora, Wi-Fi etc.) ainda exigem análise e teste de respostas offline; não declarar o jogo inteiro offline até essas funções passarem por testes.

A keystore de release é privada e não deve ser enviada ao repositório. O novo aplicativo usa o ID independente `br.com.algorithomus.mobile`; mantenha esse ID e a mesma keystore em todas as atualizações futuras desta nova linha de versões.
