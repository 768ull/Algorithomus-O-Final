# Legacy hybrid v1.9 reference

Source: `768ull/Algorithomus-App`, Gradle versionName 1.9 / versionCode 11.

This folder preserves the prior Java Activity and original media manifest for audit. It is not compiled into the new app's source set.

The recovered CI APK `Algorithomus-v1.9.apk` has SHA-256 `d8a97df39ae18f16bb59a288b9fd1160b5433fa16541689357a31e4b49fbd485`. Its asset inventory is documented in `docs/MEDIA_AND_SOURCE_ANALYSIS.md`.

The APK's JAR signature showed a self-signed certificate `CN=Algorithomus, OU=App, O=Algorithomus, L=BR, ST=BR, C=BR` (SHA256withRSA). This alone confirms only V1/JAR signing. It does not prove V2/V3/V4 or provide the original keystore.
