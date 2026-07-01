# UniPool Landing Site

This directory contains the Vite landing/satellite website that is deployed
from the `unipool-new-frontend` repo. The Expo web app is exported by the repo
root into `dist-web/`, then this site stages it under `landing/dist/app`.

## Cloudflare Pages

Use the frontend repo root as the connected repository root.

Build command:

```bash
npm ci && npm run build:pages
```

Build output directory:

```text
landing/dist
```

Framework preset: `None`.

## Local Build

From the repo root:

```bash
npm ci
npm run build:pages
```

The final Cloudflare Pages artifact is `landing/dist`.
