# App Store Connect metadata

Source of truth for UniPool's App Store metadata, kept in the repo so future
releases can replay the same copy through `asc release stage` instead of
re-typing values into the web UI.

## What is here

- `version/<version>/<locale>.json`: per-version localization fields
  (description, keywords, support URL, marketing URL, promotional text,
  what's new). The first iOS release uses `en-GB` as the primary locale.
- `app-info/<locale>.json`: app-level localization fields (display name,
  subtitle, privacy policy URL).
- `territories.txt`: comma-separated ISO 3166-1 alpha-3 territory codes that
  UniPool ships to. Mainland China (`CHN`) is deliberately excluded.
  China requires an ICP filing and a local entity, which UniPool does not
  hold, so we keep it out of distribution.

## Replaying these values on a new version

```bash
asc release stage \
  --app 6756426249 \
  --version 2.0.8 \
  --build "<BUILD_ID>" \
  --metadata-dir ios/asc-metadata/version/2.0.7 \
  --confirm
```

Substitute the new version directory once you copy `2.0.7` over and edit
`description`, `whatsNew`, and `promotionalText` for the new release.

## Bootstrapping availability for the first iOS release

The public App Store Connect API cannot create the first availability
record. The two viable paths are:

1. Use the experimental web-session command (requires a real Apple ID login
   with 2FA in a browser the first time it runs):

   ```bash
   asc web apps availability create \
     --app 6756426249 \
     --apple-id <your-apple-id-email> \
     --territory "$(cat ios/asc-metadata/territories.txt)" \
     --available-in-new-territories=false
   ```

2. Open App Store Connect: <https://appstoreconnect.apple.com/apps/6756426249/distribution/info>
   → Pricing and Availability → set up availability and paste the territory
   list, leaving China unchecked.

After the first availability record exists, future updates can run through
the public API with `asc pricing availability edit`.
