# Remembrance

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Backend](https://img.shields.io/badge/Backend-Flask-000000)
![Agent](https://img.shields.io/badge/Agent-Google%20ADK-4285F4)
![Memory](https://img.shields.io/badge/Memory-mem0-6E56CF)
![Graph](https://img.shields.io/badge/Graph-Neo4j-008CC1)
![Auth](https://img.shields.io/badge/Auth-Clerk-6C47FF)

A longitudinal cognitive care platform for Alzheimer’s that transforms everyday conversations into a continuously evolving personal memory system. The product uses natural, therapeutic dialogue to help patients recall and express memories, while an underlying AI extracts and organizes people, places, events, relationships, and emotional context into a persistent knowledge graph that models human associative memory. On top of this memory infrastructure, the system delivers personalized reminiscence therapy at scale, which proactively initiates context-aware conversations, reinforces identity anchors and stabilizes emotional state.

<img width="10972" height="3604" alt="Group 69" src="https://github.com/user-attachments/assets/74d167ff-61ef-4cb0-b2c4-4743bceb377a" />


Built with Next.js 15 (App Router) + Clerk on the frontend, and a Flask + Google ADK + Mem0 + Neo4j backend.

## Stack

**Frontend** (`remembrance/`)
- Next.js 15 (App Router, Turbopack), React 19, TypeScript
- Clerk for auth (whole app gated by `middleware.ts`)
- Tailwind v4, Fumadocs for `/docs`
- `react-force-graph-2d` for the memory graph viewer
- Picovoice Leopard for on-device speech-to-text

**Backend** (`remembrance/backend/mem0/`)
- Flask + gunicorn
- Google ADK (`gemini-2.5-flash`) as the agent runtime
- [mem0ai](https://github.com/mem0ai/mem0) for per-user long-term memory
- Neo4j as the graph store (optional — falls back to vector-only memory if unset)

## Layout

```
remembrance/
├── app/                      # Next.js App Router
│   ├── page.tsx              # Landing + chat
│   ├── chat/[id]/            # Per-conversation view
│   ├── repository/           # Memory + photo repository
│   ├── settings/, sign-in/, sign-up/
│   ├── components/
│   │   ├── neo4j.tsx         # Force-graph visualisation
│   │   ├── identity-panel.tsx
│   │   ├── proactive-prompts.tsx
│   │   └── ...
│   └── api/search/           # Frontend API route
├── backend/
│   ├── mem0/adk_memo.py      # Flask app + ADK agent + Mem0 wiring
│   └── lib/db.ts             # Client-side conversation persistence
├── content/docs/             # Fumadocs MDX
└── middleware.ts             # Clerk route protection
render.yaml                   # Render deploy config (frontend + backend)
```

## Backend endpoints

Defined in [remembrance/backend/mem0/adk_memo.py](remembrance/backend/mem0/adk_memo.py):

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/query` | One-shot agent reply |
| `POST` | `/query/stream` | SSE streaming reply |
| `GET`  | `/proactive/<user_id>` | Proactive prompt suggestions |
| `GET`  | `/graph/<user_id>` | User's memory graph |
| `POST` | `/upload` | Upload a file (photo / doc) |
| `GET`  | `/uploads/<user_id>/<filename>` | Serve uploaded file |
| `GET`  | `/user/<user_id>/memories` | List stored memories |
| `POST` | `/user/<user_id>/populate_graph` | Backfill graph from memories |
| `GET`  | `/user/<user_id>/graph` | Graph nodes/edges for viewer |
| `POST` | `/api/ai/generate` | Misc generation endpoint |
| `GET`  | `/health` | Health check |

The frontend rewrites `/user/*` and `/test_neo4j/*` to the backend (see [remembrance/next.config.ts](remembrance/next.config.ts)), so no CORS dance in production.

## Local development

Requirements: Node 20+, Python 3.11, [Bun](https://bun.sh) (lockfile is `bun.lock`, but `npm` works too).

**Backend**
```bash
cd remembrance/backend/mem0
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# create .env with the keys below
python wsgi.py            # or: gunicorn wsgi:app -b 0.0.0.0:5000
```

**Frontend**
```bash
cd remembrance
bun install               # or npm install
bun run dev               # next dev --turbopack on :3000
```

## Environment variables

Backend (`remembrance/backend/mem0/.env`):
```
GOOGLE_API_KEY=          # Gemini
MEM0_API_KEY=            # mem0ai cloud
NEO4J_URL=               # optional — graph store
NEO4J_USERNAME=
NEO4J_PASSWORD=
NEO4J_DATABASE=neo4j
```

Frontend (`remembrance/.env.local`):
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

## Deployment

[render.yaml](render.yaml) defines two Render services:
- `remembrance-backend` — Python, gunicorn, root `remembrance/backend/mem0`
- `remembrance-frontend` — Node, `npm run build && npm run start`, root `remembrance`

Set the env vars marked `sync: false` in the Render dashboard.
