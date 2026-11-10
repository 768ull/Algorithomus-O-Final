#!/usr/bin/env bash
set -euo pipefail
OUT="${1:-algorithomus-release.jks}"
ALIAS="${ANDROID_KEY_ALIAS:-algorithomus-release}"

if [ -e "$OUT" ]; then
  echo "Refusing to overwrite existing keystore: $OUT" >&2
  exit 1
fi

command -v keytool >/dev/null 2>&1 || {
  echo "keytool was not found. Install a JDK 17 or newer." >&2
  exit 1
}

echo "Create this keystore once, store it securely, and never replace it for app updates."
echo "key alias: $ALIAS"
keytool -genkeypair -v \
  -keystore "$OUT" \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 4096 \
  -validity 10000 \
  -dname "CN=Algorithomus Android, O=Algorithomus, C=BR"

echo "Keystore created: $OUT"
echo "Do not commit or upload the keystore to this repository."
