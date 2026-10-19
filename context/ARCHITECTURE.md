# Architecture — Context Tree

_Last updated: 2026-10-19 by Claude. Only update when the shape of the system changes._

## What it is
A branching AI conversation studio on a canvas. Every branch carries only its own lineage's
context, can run on a different AI (BYOK), and can be compared with its siblings. Web app at contexttree.tech.

## Main parts
| Part | What it does | Where |
|---|---|---|
| Frontend | Next.js app: auth (NextAuth, Google), canvas, console, uploads, AND a data layer that writes Postgres directly | this repo (`ContextTree-src`) |
| Canvas | `@xyflow/react` + dagre auto-layout; node types `chat`, `contextCard`, `demotedChat`; dragging disabled | `components/canvas/canvas.tsx` (~1.5k lines), `lib/canvas-layout.ts` |
| Console | Right-side chat panel (520px, resizable, fullscreen overlay) | `components/contextual-console.tsx` (~1.7k lines), `components/console/` |
| Compare | Side-by-side 2–3 branches, promote winner | `components/compare/compare-modal.tsx` |
| Data layer (Next) | Raw `pg` writes for canvases/nodes/edges/messages/uploads | `lib/mongodb.ts` (name is historical; it is Postgres) |
| Backend | FastAPI + LangGraph agent: chat streaming, fork init, summaries, memory, file ingest/RAG, web fetch | sibling repo `../ContextTree` (`app/`) |
| Database | Supabase Postgres + pgvector; forward-only migrations | `../ContextTree/db/migrations/` |

## Data flow
user message → Next.js API (session check, service JWT) → FastAPI `/chat` → builds prompt from
lineage summary + last messages + memory facts + retrieved chunks → LLM (user's key or default) →
SSE stream back → client also POSTs the reply to Next.js, which writes it again (deduped by canonical id).

Context engine detail: `../V2/10-CONTEXT-PIPELINE.md`.

## Depends on
- Supabase Postgres (pooler), pgvector
- LLM providers: NVIDIA NIM (default), Groq fallback, BYOK for OpenAI/Anthropic/Google/etc.
- Google OAuth (NextAuth)

## How the coding agent is set up here
- CLAUDE.md tells the agent: read `context/STATE.md` first; commit in the CKIC format.
- Skills / plugins: superpowers, ckic, design skills (impeccable, frontend-design).
- MCP servers: Supabase (claude.ai connector), Claude in Chrome.
- Must not touch: prod database or deployments during V3 design rounds.

## Known weak points
- **Dual writer.** Next.js and FastAPI both write the same tables. Every V2 data-loss bug
  (checkpoints 010, 016, 018, 019, 020) came from this. Target: FastAPI is the only writer (`../V2/05-ARCHITECTURE-V2.md`).
- `canvases.data` JSONB blob duplicates nodes/edges/positions that also live in tables.
- God-files: `contextual-console.tsx`, `canvas.tsx`, `lib/mongodb.ts`.
- Uploaded files are stored as `bytea` in Postgres, not in object storage. No link/video nodes yet.
