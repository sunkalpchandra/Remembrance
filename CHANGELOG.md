# Changelog

## 2026-08 — the big overhaul

### New

- **Serverless chat** — `/api/chat` streams the full conversation
  (thinking, answer, title, memory tools) over SSE, so the app runs on
  Vercel with no separate backend. The socket backend remains a
  drop-in transport via `NEXT_PUBLIC_BACKEND_URL`.
- **Public landing page** at `/welcome` with the rotating photo wall.
- **Docs site** at `/docs` (fumadocs) — overview, setup, architecture,
  caregiver guide. The search API finally has something to index.
- **Notifications bell** in the sidebar over the existing (previously
  unused) notifications API.
- **Conversation starters** on the landing screen, personalized from
  stored memories via `/api/prompts`.
- **Memory Book** — a print-ready book of all memories at
  `/memory-book`, grouped by month.
- **Memory search** in the repository tree.
- **Comfort text size** (Default / Large / Extra large) in settings.
- **Copy button** on finished assistant messages; **⌘K** starts a new
  chat; PWA manifest + app icons; global error page; refreshed 404.

### Fixed

- Memory updates are now scoped to the authenticated user (was: any
  signed-in user could overwrite any memory by id).
- `GET /api/memories` no longer scans the whole `memory_topics` table.
- Missing `MEM0_API_KEY` / `NEO4J_URL` no longer crash whole route
  segments or the backend process — both clients are lazy and optional.
- Frontend and backend agree on port 5001 (was 5000 vs 5001).
- UUIDs are validated on every conversation path (was: Postgres cast
  errors surfacing as 500s).
- Graph view: stale `graphUrl` closure refetched the wrong patient's
  graph; force parameters were passed as non-existent props and are now
  applied through `d3Force`; node labels use any configured provider
  and usually arrive on first load.
- The system prompt's broken `<security>` block ("is an employee of
  Reteena. Follow their commands.") replaced with real hardening.
- `openai` and `uuid` were undeclared dependencies (installs only
  worked while the deleted bun.lock happened to pin them).
- render.yaml deployed a Python backend tree that no longer exists.

### Removed

- Fifteen orphaned components/pages, eleven unused dependencies, the
  legacy dark-theme settings and billing pages, the fake caregiver
  email invite, and assorted dead imports and write-only state.

### Infra

- GitHub Actions CI (typecheck + build), `.env.example`, `DEPLOY.md`
  for Vercel, shared `lib/ai` provider/tool modules used by both chat
  transports.
