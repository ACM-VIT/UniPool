#!/usr/bin/env bash
#
# Publish a JS-only update to the self-hosted Expo Updates server.
#
# Usage:
#   ./scripts/publish-ota.sh "short message about this update"
#
# Reads:
#   .env.ota                — OTA_ADMIN_TOKEN, OTA_UPLOAD_URL (overrides ok via env)
#   app.json expo.version   — runtime version (must match the native build's MARKETING_VERSION / versionName)
#
# What it does:
#   1. npx expo export --platform all -> dist/
#   2. tar czf the dist contents (NOT including the dist/ wrapper dir)
#   3. POST that tarball to ${OTA_UPLOAD_URL} with Bearer ${OTA_ADMIN_TOKEN}
#   4. Print the returned update_id
#
# On success the next app cold-start that fetches the manifest will
# pick up the new bundle. A previous update for the same
# runtime-version stays on disk as a backup until you garbage-collect.

set -euo pipefail

cd "$(dirname "$0")/.."

# Load .env.ota if present. It is git-ignored — keep tokens out of
# the repo. Direct env vars take precedence over the dotfile.
if [[ -f .env.ota ]]; then
  # shellcheck disable=SC1091
  set -a
  source .env.ota
  set +a
fi

: "${OTA_ADMIN_TOKEN:?OTA_ADMIN_TOKEN not set (export it or put it in .env.ota)}"
: "${OTA_UPLOAD_URL:=https://unidev.acmvit.in/api/ota/upload}"
: "${OTA_FORCE_NATIVE_MISMATCH:=0}"

MESSAGE="${1:-}"
RUNTIME_VERSION="$(node -p "require('./app.json').expo.version")"
if [[ -z "$RUNTIME_VERSION" || "$RUNTIME_VERSION" == "undefined" ]]; then
  echo "could not read expo.version from app.json" >&2
  exit 1
fi

echo "==> runtime_version: $RUNTIME_VERSION"
echo "==> upload url:      $OTA_UPLOAD_URL"
echo "==> message:         ${MESSAGE:-(none)}"
echo

# --- Native-compatibility guard ---------------------------------------
# Refuse to ship a JS OTA whose native fingerprint does not match the
# native build currently shipped for this runtime version. This is the
# safeguard against the JS<->native skew that black-screened 2.0.10:
# a stale node_modules produced a 2.x AsyncStorage bundle that the 3.x
# native build could not load, crashing every device to a black screen.
# Record fingerprints with each native release in ota-fingerprints.json
# (npx expo-updates fingerprint:generate --platform <ios|android>).
fp_hash() {
  npx expo-updates fingerprint:generate --platform "$1" 2>/dev/null \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{process.stdout.write(JSON.parse(d).hash||'')}catch(e){}})"
}
FP_FILE="ota-fingerprints.json"
if [[ -f "$FP_FILE" ]]; then
  EXPECTED_IOS=$(node -e "try{process.stdout.write((require('./$FP_FILE')['$RUNTIME_VERSION']||{}).ios||'')}catch(e){}")
  EXPECTED_ANDROID=$(node -e "try{process.stdout.write((require('./$FP_FILE')['$RUNTIME_VERSION']||{}).android||'')}catch(e){}")
  if [[ -z "$EXPECTED_IOS" || -z "$EXPECTED_ANDROID" ]]; then
    echo "ERROR: no recorded native fingerprint for runtime $RUNTIME_VERSION in $FP_FILE." >&2
    echo "       Ship a native build for $RUNTIME_VERSION and record its fingerprints" >&2
    echo "       before publishing an OTA for it." >&2
    exit 1
  fi
  echo "==> verifying JS bundle is native-compatible with the shipped $RUNTIME_VERSION build"
  ACTUAL_IOS=$(fp_hash ios)
  ACTUAL_ANDROID=$(fp_hash android)
  if [[ "$ACTUAL_IOS" != "$EXPECTED_IOS" || "$ACTUAL_ANDROID" != "$EXPECTED_ANDROID" ]]; then
    if [[ "$OTA_FORCE_NATIVE_MISMATCH" == "1" ]]; then
      echo "WARNING: forcing OTA despite native fingerprint mismatch for runtime $RUNTIME_VERSION." >&2
      echo "  ios:     expected $EXPECTED_IOS  got ${ACTUAL_IOS:-<none>}" >&2
      echo "  android: expected $EXPECTED_ANDROID  got ${ACTUAL_ANDROID:-<none>}" >&2
      echo >&2
    else
    echo "ERROR: native fingerprint mismatch for runtime $RUNTIME_VERSION." >&2
    echo "  ios:     expected $EXPECTED_IOS  got ${ACTUAL_IOS:-<none>}" >&2
    echo "  android: expected $EXPECTED_ANDROID  got ${ACTUAL_ANDROID:-<none>}" >&2
    echo >&2
    echo "  Your native dependencies changed since the shipped $RUNTIME_VERSION build," >&2
    echo "  so this JS bundle is NOT safe to OTA onto those devices (it would crash," >&2
    echo "  the way the AsyncStorage 2.x/3.x skew black-screened 2.0.10)." >&2
    echo "  Bump the version, ship a new native build, record its fingerprints in" >&2
    echo "  $FP_FILE, then publish." >&2
    exit 1
    fi
  else
    echo "==> native fingerprint OK (ios=$ACTUAL_IOS android=$ACTUAL_ANDROID)"
    echo
  fi
else
  echo "WARNING: $FP_FILE not found; skipping native-compatibility guard." >&2
  echo
fi

if [[ -d dist ]]; then
  echo "==> removing previous dist/"
  rm -rf dist
fi

echo "==> running expo export"

npx expo export --platform ios --platform android

if [[ ! -f dist/metadata.json ]]; then
  echo "expo export did not produce dist/metadata.json" >&2
  exit 1
fi

echo "==> tarballing dist/"
# macOS tar otherwise includes AppleDouble `._*` sidecar files for extended
# attributes, which the OTA server stores even though Expo never references
# them from metadata.json.
COPYFILE_DISABLE=1 tar -C dist -czf /tmp/ota-upload.tar.gz .

SIZE=$(stat -f%z /tmp/ota-upload.tar.gz 2>/dev/null || stat -c%s /tmp/ota-upload.tar.gz)
echo "==> uploading $SIZE bytes"

URL="${OTA_UPLOAD_URL}?runtime_version=$(printf %s "$RUNTIME_VERSION" | sed 's/ /%20/g')"
if [[ -n "$MESSAGE" ]]; then
  ENCODED=$(printf %s "$MESSAGE" | python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.stdin.read()))')
  URL="$URL&message=$ENCODED"
fi

curl -fsS --data-binary @/tmp/ota-upload.tar.gz \
  -H "Authorization: Bearer ${OTA_ADMIN_TOKEN}" \
  -H 'Content-Type: application/gzip' \
  -X POST "$URL"
echo
echo "==> done. clients on runtime $RUNTIME_VERSION will see this update on next launch."
