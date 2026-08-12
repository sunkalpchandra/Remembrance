# Deploying Remembrance to Vercel

The frontend is a standard Next.js 15 app and deploys to Vercel as-is.
Chat streams through the built-in `/api/chat` SSE route, so **no separate
backend process is required** — the realtime socket backend is optional.

> **Current state (2026-08-12):** the project is live as
> `sunkalps-projects/remembrance` at
> https://remembrance-sunkalps-projects.vercel.app with deployment
> protection disabled. The build is green; every route returns 500
> until the environment variables in step 2 are added (Clerk's
> middleware needs its keys on every request). After adding them,
> redeploy: `cd remembrance && npx vercel --prod`.

## 1. Create the Vercel project

Either connect the GitHub repo in the Vercel dashboard, or use the CLI:

```bash
cd remembrance
npx vercel link       # create/link the project
npx vercel --prod     # deploy
```

**Root Directory** must be `remembrance/` (the app lives in a
subdirectory of the repo). When importing via the dashboard, set
*Settings → General → Root Directory* accordingly. Everything else
(framework preset, build command) is auto-detected.

## 2. Environment variables

Required for the app to function:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth (client) |
| `CLERK_SECRET_KEY` | Clerk auth (server) |
| `DATABASE_URL` | Neon Postgres connection string |
| one of `DIGITALOCEAN_KEY` / `HACKCLUB_KEY` / `OPENAI_API_KEY` | chat inference |

Recommended:

| Variable | Purpose |
| --- | --- |
| `CLERK_WEBHOOK_SECRET` | keeps the `users` table in sync (see step 4) |
| `MEM0_API_KEY` | semantic long-term memory (falls back to Postgres) |
| `NEXT_PUBLIC_PICOVOICE_ACCESS_KEY` | voice input |
| `OPENAI_BASE_URL`, `OPENAI_MODEL` | when using a generic OpenAI-compatible provider |

Leave `NEXT_PUBLIC_BACKEND_URL` **unset** on Vercel unless you also host
the socket backend somewhere (see below).

```bash
npx vercel env add CLERK_SECRET_KEY production
# …repeat per variable, or paste them in the dashboard
```

## 3. Database

Create a free [Neon](https://neon.tech) project and run the schema push
once from your machine:

```bash
DATABASE_URL=postgres://… npx drizzle-kit push
```

## 4. Clerk webhook

In the Clerk dashboard add a webhook endpoint pointing at
`https://<your-domain>/api/webhooks/clerk` subscribed to
`user.created`, `user.updated`, `user.deleted`, and put its signing
secret in `CLERK_WEBHOOK_SECRET`.

## Security note

Early commits in this repository's history (June 2025) committed `.env`
files. The repo is public, so treat every credential from that era —
Clerk, database, Firebase, API keys — as exposed: rotate them in their
dashboards and never reuse them. Current `.gitignore` rules keep all
`.env*` files out of the repo.

## Optional: realtime socket backend

Websocket streaming (plus Neo4j graph sync) needs a long-lived process,
which Vercel functions can't host. Deploy it to Render with the repo's
[`render.yaml`](../render.yaml) (or any VPS via
[`deploy.sh`](deploy.sh)), then set `NEXT_PUBLIC_BACKEND_URL` on Vercel
to that service's URL. The frontend switches transports automatically.
