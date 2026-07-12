# V2 — Feature List (give / remove / update)

The whole product change on one page, in plain words. Details live in
03 (why), 04 (how it looks), 05 (how it's built), 06 (full delete list
with file paths).

---

## GIVE (new features users get)

| # | Feature | In plain words | Status |
|---|---------|----------------|--------|
| F0a | **Continue on another AI** | One click moves your conversation to Claude/GPT/Gemini/Groq mid-thought. The branch carries a summary + your thread's own history. Nobody else has this. | To build (week 3, part of F5) |
| F0b | **Side question** | Ask anything in a quick branch. Your main thread never sees it. Come back clean. | To build (naming/UX on top of fork engine) |
| F1 | **Named branches + compare + promote** | Call branches "Version A / Version B", read them side by side, keep the winner. | Week 2 (days 9–10) |
| F2 | **Codex** | Pin your characters / world rules / project facts once per canvas; attach them per branch. | Week 2 (days 12–13) |
| F3 | **Compile-a-path export** | Pick the winning route through the tree → one clean Markdown document. | Week 2 (day 11) |
| F4 | **Context inspector + cost meter** | See exactly what the AI receives each turn, and tokens/$ saved vs one long chat. | Week 2 (day 14) |
| F5 | **Model switch on any node + presets** | Change a node's model anytime; "draft cheap / polish expensive" presets. | Week 3 (day 15) |
| F6 | **ChatGPT import** | Bring your ChatGPT history in as a canvas, ready to branch. | Week 3 (day 20) |
| F7 | **Template canvases + 60-sec onboarding** | New users start from "Plot decision / Research question / Blank", not an empty scary canvas. Free starter messages without needing a key. | Week 3 (day 16) |
| F8 | **Trust surface** | Privacy + terms pages, export-everything, delete-account. | Week 3 (day 21) |
| — | **New landing page (explorer-first)** | Done. `components/landing.tsx`. | ✅ Day 0 |

## REMOVE (deleted from the product)

| What | Why in one line |
|------|-----------------|
| Simulation panel + engine | We're a conversation studio, not a pipeline runner |
| Version-history panel | Branching IS the version history |
| Reports API + pages | No one asked for it; unfinished |
| Admin page | Founder + SQL is enough at this size |
| Waitlist (page + API) | We sell directly now |
| Global search | Replaced by ⌘K jump-to-branch |
| Node palette / custom node shapes / showcase | Node-type sprawl; V2 = chat nodes + codex cards |
| 3D effects, LiquidEther, StarBorder, AOS animations | Bling that slows the page; real screenshots convert better |
| 4 of 5 landing pages, 3 of 4 canvas implementations | One of each; duplicates = duplicate bugs |
| localStorage message fallback | Server is the truth; fallback caused ghost messages |
| PDF/file upload RAG | **Deferred, not dead** — Codex cards cover launch; files return later |
| Dead Mongo code + Mongo deps | Postgres-only since April |
| `/chatgpt-alternative` page | Competing head-on with ChatGPT is a losing pitch |
| Role-play/companion direction | Policy decision, final |

## UPDATE (existing things that change)

| What | From → To |
|------|-----------|
| **Security (week 1, first)** | Backend trusts whatever `user_id` the request says → verified JWT from the server only; email identity → UUID |
| Rate limits & quotas | In-memory, spoofable → Postgres, per verified user, survives restarts |
| Data writes | Two apps writing the same DB + double-stored canvases → FastAPI is the only writer; one source of truth |
| DB schema changes | Ad-hoc / at runtime → numbered migration files, run on deploy |
| Connection pools | 3 different pools → one |
| LangGraph checkpoints | Grow forever → pruned nightly |
| Streaming errors | Silent vanish → partial text kept + "Resume" button |
| Multi-tab editing | Silent overwrites → conflict detection + reload toast |
| Stripe | Scaffolding only → real $59 one-time checkout, hardened webhooks |
| Onboarding | Empty canvas → templates + walkthrough (F7) |
| Names | `mongo_store` (is Postgres!) → `store`; `lib/mongodb.ts` dies; package renamed |
| Landing | Cream serif "ChatGPT alternative" → dark explorer-first with lineage-tree hero ✅ |

## Where development happens (owner decision)

Code stays in the existing folders/repos: **`ContextTree/`** (FastAPI
backend) and **`ContextTree-src/`** (Next.js frontend). `V2/` in the
frontend repo is the canonical docs home. No monorepo restructure.
