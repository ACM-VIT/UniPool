# Self-hosted OTA updates

This app ships JS/asset updates over-the-air via `expo-updates` against a
custom update server implemented in our Go backend (no EAS, no third
parties). After a one-time native build with OTA enabled, every JS
change can roll out to all users without going through App Store
Review or the Play Store.

## How it works

```
+------------+     GET /api/manifest        +----------------+
|  iOS / RN  | ---------------------------> |  Go backend    |
|  app on    |   expo-platform: ios|android |  unipool       |
|  user      |   expo-runtime-version: 2.0.7|  -backend      |
|  device    | <--------------------------- |                |
+------------+   multipart/mixed manifest   +----------------+
                                                   |
                                                   | reads from
                                                   v
                                            /opt/unipool/ota/
                                                <runtime>/
                                                    <update-id>/
                                                        metadata.json
                                                        ios/<hash>.js
                                                        android/<hash>.js
                                                        assets/...
```

The native binary embeds the JS bundle it shipped with as a fallback.
On every cold start `expo-updates` asks our server "do you have
something newer for runtime 2.0.7?" — if yes, downloads it and
applies it on the next restart. If no, the embedded bundle runs.

## Publishing a new update

```bash
# One-time: get the admin token from a maintainer (or generate one
# with `openssl rand -hex 32`) and stick it in .env.ota:
echo 'OTA_ADMIN_TOKEN=<token>' > .env.ota

# Every time you want to ship a JS-only change:
./scripts/publish-ota.sh "fix verify sheet self-heal"
```

That:
1. Runs `npx expo export --platform all` -> `dist/`
2. Tars it
3. POSTs to `https://unidev.acmvit.in/api/ota/upload?runtime_version=2.0.7`
4. Server stores it under `/opt/unipool/ota/2.0.7/<new-uuid>/`
5. Next manifest request for runtime `2.0.7` returns the new bundle

Rollback: just publish a previous bundle again (or `mv` an old update-id
dir to be the newest mtime on the server). The previous N updates stay
on disk under their original UUIDs.

## Runtime version policy

`app.json` uses `"runtimeVersion": { "policy": "appVersion" }`, which
means the runtime ID is whatever `expo.version` is. Currently `2.0.7`.

When you ship native code changes (new package, plist tweak, podfile
update, new permission), bump `expo.version` AND the native
`MARKETING_VERSION` / `versionName`. That changes the runtime ID, so
the new native build's clients won't pick up OTAs targeted at the old
runtime — which is what you want, because OTA can't change native code.

Pure-JS releases keep the same `expo.version` and the same native
binary; only the bundle on the server changes.

## Limits and caveats

- **First OTA-capable build is the cutover.** Users on App Store build
  12 or earlier have `expo-updates` autolinked but disabled, so they
  never reach our server. Build 13 (the first with `enabled: true` +
  URL baked into Expo.plist / AndroidManifest) is the floor.
- **No code signing yet.** Anyone with the admin token can publish a
  bundle. Anyone who can MITM the manifest endpoint can serve a
  malicious bundle. Both are mitigated by HTTPS via Cloudflare, but
  code signing (`updates.codeSigningCertificate`) is the proper fix
  when this matters more.
- **App Store guideline 4.7**: OTA may only ship features that are
  already approved in the latest reviewed binary. Don't use it to add
  features the review didn't see.
- **Manifest endpoint is unauthenticated.** It only serves published
  bundles (no user data), so that's fine — but the `/api/ota/upload`
  endpoint MUST be guarded by a strong token, kept out of the repo,
  rotated when staff change.

## Server admin

```bash
# Set the token on prod (once):
ssh root@165.22.218.217 'echo "OTA_ADMIN_TOKEN=<token>" >> /opt/unipool/.env'
ssh root@165.22.218.217 'systemctl restart unipool-backend.service'

# Inspect what's published:
ssh root@165.22.218.217 'ls -la /opt/unipool/ota/2.0.7/'

# Wipe a bad release:
ssh root@165.22.218.217 'rm -rf /opt/unipool/ota/2.0.7/<bad-uuid>'

# Tail manifest hits:
ssh root@165.22.218.217 'journalctl -u unipool-backend.service -f | grep ota'
```
