# Estrutura planejada do projeto Android

```text
android-app/
├── settings.gradle.kts
├── build.gradle.kts
├── gradle.properties
├── gradlew / gradlew.bat / gradle/wrapper/
├── app/
│   ├── build.gradle.kts
│   ├── proguard-rules.pro
│   └── src/
│       ├── main/
│       │   ├── AndroidManifest.xml
│       │   ├── java/br/com/algorithomus/app/
│       │   ├── res/
│       │   └── assets/
│       │       ├── site/
│       │       ├── media/{images,audio,video,frames,gallery,profiles,app-icons,secret}/
│       │       ├── data/
│       │       ├── config/
│       │       └── offline/
│       ├── test/
│       └── androidTest/
├── scripts/
└── signing/
```

O código e a lógica do site serão integrados em `assets/site/` depois da inspeção dos arquivos originais. O conteúdo de `assets/media/` será preenchido a partir do pacote de mídia que será fornecido posteriormente. Os documentos originais na raiz do repositório não são movidos nem substituídos.
