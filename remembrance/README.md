# Remembrance — app workspace

This directory holds the Next.js frontend and the Koa/Socket.IO realtime
backend. Product overview, architecture, and layout live in the
[repository README](../README.md).

## Commands

```bash
npm install

npm run dev          # Next.js dev server on :3000 (Turbopack)
npm run server       # realtime backend on :5001 (bun)
npm run server:node  # realtime backend without bun (tsx)

npm run typecheck    # tsc --noEmit (same check CI runs)
npm run build        # production build
npm run start        # serve the production build ($PORT)
```

## Environment

Copy [.env.example](.env.example) to `.env` and fill in the keys. The
comments in that file say which are required and which degrade
gracefully when missing.

## Deploying

See [DEPLOY.md](DEPLOY.md) for Vercel, or the repo-root
[render.yaml](../render.yaml) / [deploy.sh](deploy.sh) for the other
paths.
