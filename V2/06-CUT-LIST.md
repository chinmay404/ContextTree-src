# V2 — Cut List (every deletion, with the reason)

Deletions are decisions. Each row says what dies and why. "Cut" = delete
the code. "Dormant" = keep code, disable behind a flag. "Hide" = keep
backend capability, remove from UI.

---

## Frontend — pages/routes (`ContextTree-src/app/`)

| Target | Action | Reason |
|---|---|---|
| `waitlist/` + `api/waitlist/` | Cut | V2 sells directly; a waitlist is pre-launch theater we're past |
| `admin/` + `api/user-limit/admin` | Cut | One founder + SQL console > a half-built admin UI to maintain/secure |
| `api/reports/*`, `reports` pages | Cut | Feature with no persona demand; unfinished |
| `chatgpt-alternative/` | Cut | Head-on "ChatGPT alternative" positioning died with native branching (research §1); replaced by complaint-vocabulary content later |
| `canvas-demo/`, `node-showcase/`, `integration-guide/` | Cut | Demo sprawl; ONE landing page tells the story |
| `user-limit-reached/` page | Cut | Becomes an in-studio modal (spec §2 cap flow) |
| `profile/` | Cut | Folded into a settings sheet inside /studio |
| `api/canvases/*` (Next CRUD) | Cut | Single-writer rule — FastAPI owns conversation data (arch §1) |
| `api/upload`, `api/files/*` | Dormant | PDF RAG deferred; Codex cards replace it for launch |
| `test-ssl-bypass.ts`, `.env.local.backup.*`, `contexttree-landing.tsx` (root) | Cut | Scratch/backup files in the tree |

## Frontend — components

| Target | Action | Reason |
|---|---|---|
| `landing-page-new/-old-backup/-v1/-v2.tsx` (4 of 5) | Cut | One landing page; four ghosts confuse every future change |
| `canvas-area-enhanced/-reactflow/-smooth.tsx` (3 of 4) | Cut | One canvas implementation (spec §3); triplicate = triple bugs |
| `simulation-panel.tsx`, `lib/simulation-engine.ts` | Cut | Flow-executor fantasy; V2 is a conversation studio, not a pipeline tool (decision §1 NOT-list) |
| `version-history-panel.tsx`, `lib/version-manager.ts` | Cut | Unfinished; branching IS the versioning story |
| `global-search.tsx` | Cut | Replaced by scoped `⌘K` jump-to-branch (spec §10) |
| `node-palette.tsx`, `node-palette-enhanced.tsx`, `node-customization/`, `nodes/` custom shapes, `showcase/`, `node-showcase.tsx` | Cut | Node-type sprawl; V2 has chat nodes + codex cards, period |
| `LiquidEther`, `StarBorder`, `reactbits-effects.tsx`, `product-demo-animation.tsx`, `metallic-logo.tsx` | Cut | 3D shader landing bling; a real product screenshot converts better and drops `three`/`aos` from the bundle |
| `user-stats.tsx` | Cut | Vanity surface; cost meter (F4) is the real number |
| `bug-report-form.tsx` + `api` + `bug_reports` table | Cut | Beta feedback = one Discord/email link; `feedback-dialog.tsx` stays as a mailto wrapper |
| `chat-panel.tsx` (duplicate of console chat) | Cut | Console split (spec §7) makes it redundant |
| `lib/storage.ts` localStorage message fallback | Cut | Server is truth; fallback causes ghost-message bugs (audit A3) |
| `lib/mongodb.ts` | Cut | Dies with the Next CRUD routes; misnamed anyway (audit A6) |

## Frontend — dependencies (`package.json`)

Cut: `mongodb`, `@next-auth/mongodb-adapter` (Mongo era is over),
`reactflow` alias (one xyflow import path), `three`,
`@react-three/fiber`, `@react-three/drei`, `aos` (landing bling),
`recharts` (no charts in V2 UI — cost meter is text/bars in CSS),
`mammoth`, `pdf-parse` (dormant with file RAG).
Rename package `my-v0-project` → `context-tree-studio`.

## Backend (`ContextTree/`)

| Target | Action | Reason |
|---|---|---|
| `app/agent/store/MongoStore.py` (384 lines), `quadrant_store.py` | Cut | Dead since the Postgres migration; the `mongo_store` NAME dies too (arch §5) |
| `ChatMessage.user_id` body field | Cut | Identity comes from the verified JWT only (arch §2) — this deletion IS the security fix |
| `endpoints/files.py` ingest path | Dormant | `FILES_ENABLED=false`; returns 503 with "coming back" message |
| NVIDIA + LiteLLM in the model picker | Hide | Dispatcher keeps all 6 providers; UI shows Groq/Gemini/OpenAI/Anthropic — fewer decisions at BYOK setup (LiteLLM returns for power users post-launch) |
| Sync `POST /chat` endpoint | Keep | Cheap to keep, useful for tests/import replay — but no UI path uses it |
| `test.py`, `check_async.py`, `check_imports.py`, `res.json`, `app.log`, `image.png` | Cut | Scratch debris |
| `.env` (committed), `CONTEXTTREEAPI.pem` | Cut + **rotate all secrets** | Credentials in the tree = leaked, by policy (arch §5) |
| `core_arcitetcure.md`, `CONTEXT_TREE_REPORT.md` | Cut | Obsolete pointer stubs; ARCHITECTURE.md + V2/ are the docs |

## Repo root (`d:\code\context_tree\`)

Cut: `check_ancestry.py`, `check_db_state.py`, `check_edges_schema.py`
(one-off debug scripts — superseded by real tests), `dataset_*.jsonl`
(LangSmith export with personal data — should never be in a repo),
`temp_env_file` (rotate whatever is in it), both PDFs (move to Drive/vault;
binaries don't belong in the repo), `CONTEXTTREEAPI.pem` (rotate + delete).
`HANDOVER.md` gets a banner: "historical — superseded by V2/".

## Features cut from the CONCEPT (not just code)

| Feature | Verdict | Reason |
|---|---|---|
| Simulation / step-execution of graphs | Never | Different product (decision §1) |
| Model comparison as a standalone pitch | Never | Free everywhere (research §4-comparison); compare exists ONLY as branch-compare inside the workflow |
| PDF/file RAG | Post-launch | Half-built, dimension-conflicted (A7), not needed by the launch persona — Codex cards cover it |
| Role-play/companion features | Never | Policy decision (decision §6) |
| Teams/sharing/collab | Post-revenue | The B2B layer comes after individual PMF (TypingMind sequence) |
| Waitlist growth motion | Never | Direct sales from day one |

## What explicitly SURVIVES every cut

The four-layer memory engine, transactional lazy fork, ancestry-scoped
retrieval, 6-provider dispatcher + BYOK crypto, SSE pipeline, Stripe
scaffolding, advanced-settings layer, `@xyflow/react` canvas (one),
model-selection panel, NextAuth Google sign-in, LangSmith tracing.
The cut list removes ~40% of the frontend surface and ~0% of the moat.
