plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "br.com.algorithomus.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "br.com.algorithomus.mobile"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        buildConfigField("String", "OFFICIAL_SITE_URL", "\"https://algorithomus.com.br/\"")
        buildConfigField("String", "OFFLINE_ASSET_URL", "\"https://appassets.androidplatform.net/assets/offline/index.html\"")
    }

    androidResources {
        // Keep original media bytes un-reencoded and support AssetFileDescriptor
        // + HTTP Range responses for local audio/video playback and seeking.
        noCompress += setOf(
            "png", "webp", "jpg", "jpeg", "gif", "svg", "ico", "bmp", "avif",
            "mp3", "ogg", "oga", "wav", "m4a", "aac", "flac", "opus", "mid", "midi",
            "mp4", "webm", "m4v", "mov", "3gp",
            "woff", "woff2", "ttf", "otf"
        )
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        release {
            isMinifyEnabled = false
            // A chave definitiva será carregada somente por variáveis/segredos de CI.
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    lint {
        abortOnError = true
        checkReleaseBuilds = true
    }

    packaging {
        resources {
            excludes += setOf("META-INF/DEPENDENCIES", "META-INF/LICENSE*", "META-INF/NOTICE*")
        }
    }
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.10.0")
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.webkit:webkit:1.18.0")

    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test:runner:1.6.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
}
