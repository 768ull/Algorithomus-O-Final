# Algorithomus Android

Aplicativo Android independente, com Activity nativa em tela cheia e WebView para executar o site oficial.

## Estado atual

- Shell Android nativo criado em Kotlin.
- AndroidX WebKit incluído.
- O site oficial é aberto em `https://algorithomus.com.br/`.
- Se a página principal falhar ao carregar, o app mostra uma tela local de contingência.
- A tela offline é apenas uma base técnica; o jogo offline ainda depende da extração e integração dos arquivos originais, scripts e mídias.
- Os arquivos originais do repositório permanecem fora desta pasta.

## Compilar

Abra esta pasta no Android Studio ou execute:

```bash
gradle assembleDebug
```

O APK de depuração será gerado em `app/build/outputs/apk/debug/`.

## Assinatura de distribuição e atualizações

A chave de assinatura definitiva **não deve ser enviada ao GitHub**. Ela será armazenada em segredos protegidos do repositório e usada no workflow de release. É indispensável manter cópias seguras da chave e das senhas: futuras versões precisam usar a mesma identidade de assinatura para atualizar a instalação existente.

V1, V2 e V3 são esquemas de assinatura do APK. V4 é complementar e produz um arquivo `.idsig` separado para instalações incrementais. A configuração final será validada com a versão do Android SDK Build Tools usada na compilação.

## Próximas etapas técnicas

1. Extrair e comparar os documentos e o snapshot do site sem modificar os originais.
2. Mapear scripts, rotas, endpoints, armazenamento, apps internos e dependências do servidor oficial.
3. Integrar os arquivos offline e as mídias originais, preservando caminhos e referências.
4. Adaptar a arte fornecida para ícones adaptativos Android, mantendo todo o desenho dentro da área segura.
5. Implementar e testar o fluxo de assinatura de release e atualização sobre uma instalação anterior.
