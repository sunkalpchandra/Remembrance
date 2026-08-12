# Remembrance

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Backend](https://img.shields.io/badge/Backend-Koa%20%2B%20Socket.IO-33333D)
![Memory](https://img.shields.io/badge/Memory-mem0-6E56CF)
![Graph](https://img.shields.io/badge/Graph-Neo4j-008CC1)
![DB](https://img.shields.io/badge/DB-Neon%20Postgres-00E599)
![Auth](https://img.shields.io/badge/Auth-Clerk-6C47FF)

A longitudinal cognitive care platform for Alzheimer's that transforms everyday conversations into a continuously evolving personal memory system. The product uses natural, therapeutic dialogue to help patients recall and express memories, while an underlying AI extracts and organizes people, places, events, relationships, and emotional context into a persistent knowledge graph that models human associative memory. On top of this memory infrastructure, the system delivers personalized reminiscence therapy at scale, proactively initiates context-aware conversations, reinforces identity anchors, and stabilizes emotional state.

<img width="10972" height="3604" alt="Remembrance screens" src="https://github.com/user-attachments/assets/74d167ff-61ef-4cb0-b2c4-4743bceb377a" />

## Stack

**Frontend** (`remembrance/`)
- Next.js 15 (App Router, Turbopack), React 19, TypeScript, Tailwind v4
- Clerk auth — the whole app is gated by `middleware.ts` (onboarding → role routing → HIPAA for caregivers)
- Neon Postgres + Drizzle ORM (conversations, messages, memories, topics, caregiver notes, notifications, analytics events)
- `react-force-graph-2d` memory graph with AI-generated node labels
- Novel (tiptap) block editor for the memory repository
- Picovoice Leopard for on-device speech-to-text

**Realtime backend** (`remembrance/backend/`)
- Koa + Socket.IO (TypeScript), run with `bun` or `tsx`
- Streams chat over websockets with Clerk token verification
- OpenAI-compatible inference providers (DigitalOcean Gradient + Hack Club proxy), model picker in the UI
- Tool loop: `save_user_info` / `retrieve_user_info` backed by [mem0](https://github.com/mem0ai/mem0) + Postgres (mem0 and Neo4j are optional — everything degrades to Postgres)

## Layout

```
remembrance/
├── app/                      # Next.js App Router
│   ├── [[...chatId]]/        # Landing + chat (optional catch-all)
│   ├── repository/           # Memory repository: tree + editor + graph
│   ├── dashboard/            # Caregiver dashboard (patients, activity, memories)
│   ├── onboarding/, hipaa/   # Role selection and caregiver HIPAA flow
│   ├── components/           # Sidebar, messages, graph, settings modal, …
│   └── api/                  # conversations, memories, graph, notifications,
│                             # search, Clerk webhooks
├── backend/                  # Koa + Socket.IO realtime backend
│   ├── index.ts              # HTTP routes (graph, uploads, health)
│   ├── sockets.ts            # Chat streaming + memory tool loop
│   ├── models.ts             # Inference provider registry
│   └── neo4j.ts              # Optional graph store
├── db/schema.ts              # Drizzle schema
├── middleware.ts             # Clerk route protection + role routing
└── deploy.sh                 # Self-hosted deploy (nginx + pm2 + certbot)
render.yaml                   # Render deploy config (frontend + backend)
```

## Local development

Requirements: Node 20+ (or [Bun](https://bun.sh) for the backend).

```bash
cd remembrance
cp .env.example .env          # fill in keys (see below)
npm install

npm run dev                   # frontend on :3000
npm run server                # backend on :5001 (bun)
npm run server:node           # …or without bun (tsx)
```

Minimum env to sign in and chat: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
`CLERK_SECRET_KEY`, `DATABASE_URL`, and one inference key
(`DIGITALOCEAN_KEY` or `HACKCLUB_KEY`). `MEM0_API_KEY`, Neo4j, and
Picovoice are optional — features degrade gracefully without them.

## Deployment

- **Vercel** — deploy the `remembrance/` directory as a Next.js app; see
  [`remembrance/DEPLOY.md`](remembrance/DEPLOY.md) for the exact steps and
  required env vars.
- **Render** — [`render.yaml`](render.yaml) defines both services
  (frontend + websocket backend).
- **Self-hosted** — [`remembrance/deploy.sh`](remembrance/deploy.sh)
  provisions nginx, pm2, and certbot on a VPS.
