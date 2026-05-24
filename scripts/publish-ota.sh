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
tar -C dist -czf /tmp/ota-upload.tar.gz .

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
