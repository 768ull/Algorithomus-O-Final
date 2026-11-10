#!/usr/bin/env bash
set -euo pipefail

: "${ANDROID_KEYSTORE_PATH:?Set ANDROID_KEYSTORE_PATH}"
: "${ANDROID_KEY_ALIAS:?Set ANDROID_KEY_ALIAS}"
: "${ANDROID_KEYSTORE_PASSWORD:?Set ANDROID_KEYSTORE_PASSWORD}"
: "${ANDROID_KEY_PASSWORD:?Set ANDROID_KEY_PASSWORD}"

INPUT_APK="${1:-app/build/outputs/apk/release/app-release-unsigned.apk}"
OUTPUT_APK="${2:-app/build/outputs/apk/release/algorithomus-release.apk}"
BUILD_TOOLS_VERSION="${ANDROID_BUILD_TOOLS_VERSION:-35.0.0}"
SDK_ROOT="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
APKSIGNER="$SDK_ROOT/build-tools/$BUILD_TOOLS_VERSION/apksigner"

test -f "$INPUT_APK"
test -x "$APKSIGNER"
mkdir -p "$(dirname "$OUTPUT_APK")"

"$APKSIGNER" sign \
  --ks "$ANDROID_KEYSTORE_PATH" \
  --ks-key-alias "$ANDROID_KEY_ALIAS" \
  --ks-pass env:ANDROID_KEYSTORE_PASSWORD \
  --key-pass env:ANDROID_KEY_PASSWORD \
  --v1-signing-enabled true \
  --v2-signing-enabled true \
  --v3-signing-enabled true \
  --v4-signing-enabled true \
  --out "$OUTPUT_APK" \
  "$INPUT_APK"

"$APKSIGNER" verify --verbose --print-certs "$OUTPUT_APK"
echo "Signed APK: $OUTPUT_APK"
echo "V4 signature sidecar, if emitted: $OUTPUT_APK.idsig"
