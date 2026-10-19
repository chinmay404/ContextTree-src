# Context Tree V3 — the board, on the same engine

_Date: 2026-10-19 · Status: approved by owner 2026-10-19 (answers in §12) · Branch: `v3` (frontend), `v3` to be created (backend)_

## 1. Intent

V3 replaces the V2 studio (xyflow canvas + right-hand console) with **the board** designed in
`docs/design/pebble-desks-prototype.html`. The prototype is the frontend spec: what it shows and how
it moves is what V3 ships. The **engine** (FastAPI + LangGraph in `ContextTree/`) stays: lineage-scoped
branches, the fork summary + buffer, pgvector retrieval, model routing, BYOK, streaming, ingestion.

The owner's words: "use this frontend and use the same engine".

Why now: Slashspace shows people pay for a canvas of AI chats plus sources. V2 never tested the market.
The board is our own identity (desks, strings, wobbly Pebble objects, full-screen focus view).

## 2. Goals, non-goals, anti-goals

**Goals**
1. Every behaviour in the prototype works against real data. §4 maps each one to the engine.
2. FastAPI becomes the **only writer** of canvas, node, edge, message and file data. Next.js keeps only
   auth (NextAuth tables), and proxies everything else.
3. A chat reads exactly what the board shows it reads. The engine computes that set itself (§5.2), so
   what the UI shows and what the model gets cannot disagree.
4. Card positions are saved; the board looks the same after a reload.
5. New source types: notes, web pages and YouTube videos become real, readable sources.

**Non-goals (V3.0)**
- Teams and sharing, orchestrator/agents, MCP connections, a desktop app, a pipeline builder (from `DIRECTION.md`).
- Payments (Stripe). Separate project after V3.
- Dark theme (Pebble is light-only, DECISIONS row 32).
- Mobile layout beyond "it opens and you can read". The board is a desktop tool.

**Anti-goals (a failure even if it works)**
- Looking like Slashspace (DECISIONS row 23).
- Any write path where the browser sends a whole canvas and the server replaces rows from it. The cause of
  every V2 data-loss bug (V2 checkpoints 010, 016, 018, 019, 020).
- Chats silently reading something the board does not show, or not reading something it does show.
- Losing the feel of the prototype: springs, swinging strings, wobble, pile slide.

## 3. Constraints

- Prod is live (contexttree.tech on Vercel, `api-production-…railway.app`, Supabase Postgres + pgvector,
  pooler capped at 3 connections). V2 must keep working on the same database until V3 is switched on.
  **All schema changes are additive** (new columns/tables; nothing renamed or dropped) until the switch.
- Migrations run on backend deploy (`scripts/migrate.py`). They must be idempotent and forward-only.
- Auth stays NextAuth v4 + Google. The engine trusts only the 60-second HS256 JWT minted by Next
  (`lib/backend-jwt.ts`). Tenancy key stays `user_email` (all rows already use it).
- Agents may not read prod data or push; the owner pushes and deploys.
- Node cap stays 50 per board for now (`lib/limits.ts`). Sources count toward it.

## 4. Prototype → engine map

Vocabulary: a **board** = a V2 canvas. A **card** = a node. A **chat** = a node with messages. A **source**
= any other card (note, PDF, doc, web page, video, audio, CSV, image, pile). A **desk** = the sources that
belong to one chat. A **string** = a hand-made link. A **tube** = the drawn parent → branch line.

| Prototype concept | Stored as | Engine behaviour |
|---|---|---|
| Board | `canvases` row (unchanged). `canvases.data` keeps only `viewport` from now on. | — |
| Chat card | `nodes` row, `kind='chat'` | Has messages; runs turns |
| Branch (tube from parent) | `nodes.parent_node_id` + `forked_from_message_id` + `ancestor_ids` (unchanged), plus an `edges` row `kind='lineage'` | Existing fork init |
| Source card | `nodes` row, `kind='source'`, `source_type` ∈ note, pdf, doc, web, video, audio, csv, image, pile | Readable once `status='ready'` |
| Card position | new `nodes.x`, `nodes.y` (double precision) | Saved by `PATCH …/positions` |
| Desk (source sits on a chat's desk) | new `nodes.desk_id` → the chat's id (null = loose on the board) | Chat reads it; branches read it unless "Read the desk above" is off |
| String: source → chat | `edges` row `kind='wire'`, `from_node=source`, `to_node=chat` | Chat reads that source |
| String: chat answer → chat | `edges` row `kind='answer'`, `from_node=answering chat`, `to_node=reading chat` | Reading chat gets the other chat's latest answer (§5.3) |
| Pile (stack) | `nodes` row `source_type='pile'`; members are source rows with new `nodes.pile_id` → pile | Pile reads as the union of its members that are not switched off |
| "What is this for?" | `nodes.data.desc` | Sent as the source's label line in the prompt |
| Excerpt on/off chips | `nodes.data.excerpts[]` `{loc, text, on}` | Off excerpts are never sent |
| Leave an inherited source out (focus view) | chat `nodes.data.hide[]` (source ids) | Removed from the read set for this chat and its branches |
| Branch sheet: name, model, persona | `nodes.data.name`, `.model`, `.persona` (preset key) + `.systemPrompt` (its text) | `systemPrompt` sent per turn, as today |
| Branch sheet: "Read the desk above" | `nodes.data.inheritDesk` (default true) | §5.2 |
| Branch sheet: starts with summary / whole chat / fresh start | `nodes.data.carry` ∈ summary, whole, fresh | §5.4 |
| Advanced: creativity, longest answer, history, excerpts per question, token budget | `nodes.data.advanced` (same shape as V2 `AdvancedSettings`) | temperature, maxOutputTokens, lastKMessages, externalContextTopK; budget see §5.5 |
| Q1 / Q1.2 numbering, trail, timeline | derived in the frontend from lineage + `created_at` | — |
| Model dot colour | derived from `model` | — |
| Compare / promote (V2) | `nodes.data.demoted` (unchanged) | Kept; entry point in V3 = focus view menu "Compare with siblings" |
| Viewer content per type | `external_files` (+ `file_chunks`) and `nodes.data` fields listed in §6 | — |

Why columns for `x`, `y`, `desk_id`, `pile_id`, `kind` instead of keys inside `nodes.data`: the engine must
query them (read set, piles), and a jsonb blob with several writers loses updates
(vault: *Lost updates on shared JSON blobs*). `nodes.data` keeps only fields the engine never filters on.

## 5. Engine changes

### 5.1 Single writer: board API in FastAPI

New router `app/api/v1/endpoints/board.py`. All routes take the JWT; every query is scoped by `user_email`.
Every write touches one entity. No route accepts a whole board.

```
GET    /boards                         list (id, title, updated_at, card count)
POST   /boards                         create {title} → board with one empty chat
GET    /boards/{b}                     full board: cards, edges, viewport (messages NOT included)
PATCH  /boards/{b}                     {title?, viewport?}
DELETE /boards/{b}

POST   /boards/{b}/cards               create a card {id, kind, source_type?, x, y, desk_id?, pile_id?, parent_id?, forked_from_message_id?, data}
PATCH  /boards/{b}/cards/{id}          partial {data keys..., desk_id?, pile_id?}; data is merged key by key with jsonb ||, never replaced
DELETE /boards/{b}/cards/{id}          soft-deletes (sets deleted_at) the card and, for a chat, its whole subtree; their strings go with them; sources on those desks fall loose (desk_id=null), never deleted
POST   /boards/{b}/cards/{id}/restore  undo of the above (clears deleted_at on the same set)
PATCH  /boards/{b}/positions           [{id, x, y}] batch, one UPDATE … FROM (VALUES …)

POST   /boards/{b}/edges               {id, kind: wire|answer, from, to} — lineage edges are created by the server only
DELETE /boards/{b}/edges/{id}

GET    /boards/{b}/cards/{id}/messages visible messages (inherited=false), ordered by position
GET    /boards/{b}/cards/{id}/reads    the read set (§5.2) with token estimates, for the focus view and the token meter

POST   /boards/{b}/sources/file        multipart upload → card + external_files + background ingest (moves here from Next /api/upload)
POST   /boards/{b}/sources/link        {url, x, y, desk_id?} → web or video card + background ingest
GET    /files/{card}/raw               original bytes (moves from Next)
```

`POST /chat/stream` stays. Two changes: it **requires** the card to exist (no more silent
`_get_default_canvas` insert), and it ignores `contextNodeIds` from V3 clients (the engine resolves the read
set itself). V2 clients keep sending `contextNodeIds` and keep working.

Next.js gets one catch-all proxy `app/api/engine/[...path]/route.ts`: checks the NextAuth session, mints
the JWT, forwards method/body/query, streams the response. V3 code calls only this proxy. The V2 routes stay
until V3 is switched on, then are deleted together with `lib/mongodb.ts` (separate step, §9).

**Deleting** (Claude's call, owner to confirm): deleting a chat asks once, naming what goes ("Delete Q2 and its
3 branches? Sources on their desks stay on the board."), then shows an Undo toast for 10 s. Deletion is soft
(`nodes.deleted_at`, `edges.deleted_at`); every read filters `deleted_at is null`, including the engine's
lineage, retrieval and read-set queries. Rows are never hard-deleted in V3.0. Deleting a source or a pile
needs no confirm, only the Undo toast. Re-rooting branches under a deleted parent is not offered: in a tree
whose meaning is lineage, an orphaned branch reads wrong (its Q-number and inherited context would change).

Write rules (vault: *Diff-based sync deletes on stale snapshots*, *Canonical record identity across dual writers*):
- No endpoint infers a delete from absence.
- Ids are generated by the client (as today) so optimistic UI and retries are idempotent; every insert is
  `ON CONFLICT (id) DO NOTHING` / scoped update.
- The frontend never writes messages. The engine already stores both turns (`<base>_u` / `<base>_a`).

### 5.2 The read set (what a chat reads)

One function, `resolve_reads(chat_id)`, in `app/agent/reads.py`. It is the server version of the
prototype's `ctx()` and replaces `contextNodeIds` for V3:

```
own(c)   = sources with desk_id = c                       (how='desk')
         ∪ sources with a wire edge → c                   (how='wire')
         ∪ chats with an answer edge → c                  (how='answer')
up(c)    = if c.parent and c.inheritDesk: reads(c.parent) minus anything already in own(c)
reads(c) = own(c) ∪ up(c), minus ids in c.hide, minus sources whose status != 'ready'
piles    → expanded to their members that are not switched off
```

It returns `[{card_id, how, via (which chat it came through), inherited, tokens}]`.

Recursion follows `ancestor_ids`, so it costs one query per lineage level at most. Depth is bounded by the
50-card cap.

The context builder (`_build_retrieved_context`, `app/agent/main.py`) uses the result:
- **File-backed sources** (pdf, doc, csv, web, video, audio): pgvector search over `file_chunks` limited to
  those files (existing `get_related_file_context` with an explicit id list), k = `externalContextTopK`.
  Chunks whose locator matches a switched-off excerpt are skipped.
- **Notes**: the whole text (they are short; cap 4 000 chars each), no retrieval.
- **Images**: the stored description (§6).
- **`desc`** ("What is this for?") goes on the source's header line: `[source | PDF | Pricing survey 2025 | for: Our main benchmark…]`.

The UI's "Reads" list, the desk dots and the token meter all call `GET …/reads`. The prototype's client
`ctx()` stays only for instant feedback while dragging, then reconciles with the server.

### 5.3 Answer strings (chat → chat)

This is new; the engine cannot do it today. When chat B has an answer edge from chat A, B's prompt gets an
`<LINKED_ANSWERS>` block: A's name, then **A's latest assistant message** (clipped to 3 000 chars). If A has a
rolling summary, that comes first (clipped to 1 200 chars).

Rules:
- An answer string may not point to an ancestor or descendant (prototype `canPlug`). The server re-checks
  this on `POST /edges` and returns 409.
- If A has no answer yet, it is listed in the read set as "waiting" and adds nothing.

### 5.4 Branch start modes (`carry`)

These extend `_init_fork_if_needed` (`app/api/v1/endpoints/chat.py:159`):
- `summary` (default): what the engine does today. Summary of the lineage up to the fork point, plus the last
  `FORK_BUFFER_MESSAGES` messages verbatim.
- `whole`: no summary. Copy the parent's messages up to the fork point as inherited buffer rows. Cap at the
  last 40 messages or about 12 000 tokens; the older part falls back to the summary.
- `fresh`: no inheritance of messages or summary. Lineage columns are still written (the tube is still
  drawn and the read set can still inherit the desk if `inheritDesk` is on).

`carry` and `inheritDesk` are independent switches, as in the branch sheet.

### 5.5 Smaller engine fixes that V3 depends on

- **Lineage only from lineage edges.** The fork-parent fallback (`PostgresStore.py:326-343`) must read only
  edges with `kind='lineage'`. Otherwise a wire or answer string into a chat would be taken as its parent.
- **`edges.kind` backfill.** `meta.condition='Fork'` or `data.meta.condition='Fork'` → `lineage`.
  `'Context'` → `wire`, with from/to swapped: V2 stored chat→file, V3 stores source→chat.
- **`/files/ingest` ownership check.** The file must belong to the JWT user. Today it is not checked.
- **Summary every turn.** `summury_decision` keeps firing after turn 10 because `count` never resets. Reset
  it after summarising.
- **Token budget** (`advanced.budget`). When set, drop retrieved chunks lowest score first until the
  estimated prompt fits (chars/4 estimate). If unset, no change.
- **Persona presets** live in the frontend (prototype `PERSONAS`). The engine sees only `systemPrompt`.

### 5.6 Schema migration `009_v3_board.sql` (additive)

```sql
alter table nodes add column if not exists kind text;            -- 'chat' | 'source'
alter table nodes add column if not exists source_type text;     -- note|pdf|doc|web|video|audio|csv|image|pile
alter table nodes add column if not exists x double precision;
alter table nodes add column if not exists y double precision;
alter table nodes add column if not exists desk_id text references nodes(id) on delete set null;
alter table nodes add column if not exists pile_id text references nodes(id) on delete set null;
alter table nodes add column if not exists status text;          -- processing|ready|failed (sources)
alter table nodes add column if not exists deleted_at timestamptz;
alter table edges add column if not exists kind text;            -- lineage|wire|answer
alter table edges add column if not exists deleted_at timestamptz;
alter table canvases add column if not exists title text;        -- V2 kept it only inside data
alter table canvases add column if not exists board_version smallint; -- 3 = V3 board; null = V2 canvas
create index if not exists nodes_desk_idx on nodes(desk_id);
create index if not exists nodes_pile_idx on nodes(pile_id);
create index if not exists edges_to_kind_idx on edges(to_node, kind);
-- backfill edges.kind only (rules in §8); V2 canvases are not converted
```

Check every column type against `information_schema` in the migration's test (vault: *ADD COLUMN IF NOT
EXISTS never fixes a wrong column type*).

## 6. Sources and ingestion

| Type | How it gets in | Stored | Viewer shows | Ships in |
|---|---|---|---|---|
| Note | Add menu, N, double-click the board, paste text | `nodes.data.text` | editable text | V3.0 |
| PDF, DOCX, TXT, MD | drop / Upload | `external_files` + `file_chunks` (page locators exist for PDF) | page strip / text, overview, key passages | V3.0 (engine has it) |
| Web page | paste or drop a link | fetched with existing `helpers/web_fetch.py` (SSRF guard), text chunked into `file_chunks`, title + summary in `nodes.data` | summary + passages with § locators | V3.0 |
| YouTube | paste a youtube.com / youtu.be link | title + thumbnail only (YouTube oEmbed, `i.ytimg.com`); `status='soon'`, not read by chats | thumbnail, title, "Reading videos is coming soon" | card V3.0, transcript later |
| CSV | drop | parsed rows → one chunk per ~40 rows, `loc='rows a–b'`; first 200 rows kept for the table view | table | V3.0 |
| Image | drop / paste | bytes in `external_files`; `status='soon'`, not read by chats | large image, "Reading images is coming soon" | card V3.0, reading later |
| Audio / podcast | drop | bytes in `external_files`; `status='soon'`, not read by chats | player, "Reading audio is coming soon" | card V3.0, reading later |
| Pile | drop a source on another source | pile row + members via `pile_id` | members, each openable | V3.0 |

Every new source gets a short **overview** (one LLM call with `SUMMARY_MODEL_NAME` at ingest) and up to five
**key passages** (top chunks by similarity to the overview). These fill the card excerpt chips and the viewer.

Ingest status flow: `processing → ready | failed`, on the `nodes.status` column. `soon` marks a card the
board shows but no chat reads yet (owner, 2026-10-19: video, image and audio reading are "coming soon"). The
card shows a small "coming soon" pill; the read set skips it like any non-ready source; its desk dot is hollow. The board polls
`GET /boards/{b}` every 2 s while any card is processing (no websockets in V3.0).

File bytes stay in Postgres `bytea` for V3.0 (no storage migration). **Upload cap drops to 4 MB** in V3.0
(Claude's call): uploads go through the Next proxy on Vercel, which rejects request bodies over 4.5 MB, so
V2's 10 MB cap never really worked there. Bigger files need a direct browser → engine upload with a
short-lived upload-only token, which changes the auth model; that is a later project together with moving
bytes to object storage.

## 7. Frontend

**Where it lives.** It stays in the same Next.js app (`ContextTree-src`), on the `v3` branch. The board
replaces what `/` renders for signed-in users, behind a flag (`NEXT_PUBLIC_BOARD_V3=1`) until the switch. The
landing page, sign-in, admin, privacy and terms are untouched. Each board gets a URL, `/b/[boardId]`; V2 had
none.

**How the prototype becomes code** (builder's call where not stated):
- The board engine is ported from the prototype's vanilla JS into plain TypeScript modules under
  `components/board/engine/`: springs, camera, frame loop, cards, strings/tubes, desks, makeRoom /
  separateDesks, piles, drag, live string. It renders to the DOM imperatively, as the prototype does. **It does
  not use xyflow.** The prototype's spring physics, desk springs and swinging strings are not xyflow's model,
  and porting them onto it would lose the feel. `@xyflow/react` and `dagre` stay in V2 code only.
- React owns the chrome: the branch sheet, the viewers, the focus view (chat + timeline + connected sources),
  the Add and right-click menus, the zoom control, the trail bar, the board list and BYOK settings.
- One store module (`components/board/store.ts`) holds the board state. It talks to the engine through the
  proxy, applies optimistic changes and reconciles. Merges are per entity (`{id, changes}`), never a whole-board
  `setState` from a fetched snapshot (vault: *Lost updates on shared JSON blobs*, client-state variant).
  Freshly created cards are pinned until the server copy includes them.
- Position saves are debounced: 600 ms after the last spring settles, one `PATCH …/positions` carries every
  moved card. That includes cards moved by makeRoom/separateDesks.
- Chat streaming reuses the V2 SSE reader (`message`, `summary`, `web_search`, `error`, `[DONE]`,
  `<think>` blocks).
- Fonts and tokens come from the Pebble design system (Bricolage Grotesque etc.). Pebble CSS becomes
  `components/board/pebble.css` with the prototype's tokens; it does not mix with the V2 Tailwind theme.
- Reduced motion: keep the prototype's `RM` behaviour.

**Prototype features carried 1:1** (DECISIONS rows 26–52): desks; wobble; jelly desks; swinging strings;
pill ports; drag a string from a port; drag a chat's out-port to empty board = branch sheet there; click a
string → Disconnect; double-click viewers per type; Add button + right-click menu + N/Q keys; drop and paste
detection with "What is this for?"; scroll flips piles with the slide; map-style desk labels; pebbles-only
below 42% zoom; makeRoom / separateDesks; focus view with timeline and connected sources; leave inherited
sources out.

**V2 features that must survive** (DECISIONS row 17): continue on another AI (model switch in the focus
view), per-branch model and persona, compare/promote (focus view menu), BYOK dialog (reused as is), web
search toggle (in the composer), re-ask a user message in a new branch (message menu in the focus view →
branch sheet with that message as the first question).

## 8. Existing V2 boards

**V3 starts with fresh boards** (owner, 2026-10-19). V2 canvases are not migrated and V3 does not show them.
- New column `canvases.board_version smallint`. V3 creates boards with `3`; `GET /boards` lists only those.
  V2 rows keep `null` and stay in the database untouched, so V2 keeps working until the switch and nothing
  is deleted.
- `edges.kind` is still backfilled for existing rows (`'Fork'` → `lineage`, `'Context'` → `wire`, swapping
  from/to), because the same engine keeps serving V2 and the fork-parent fallback (§5.5) must read lineage
  edges only.
- After the switch, V2 boards are unreachable from the UI. Whether to offer an export or a read-only view of
  them later is a separate decision.

## 9. Rollout

1. **Engine** (backend `v3` branch): migration 009, board router, read set, answer strings, carry modes,
   fixes, ingestion. Tests run against a local Docker pgvector (`TEST_DATABASE_URL`). V2 keeps working on it.
2. **Board frontend** (`v3` branch): built against an in-memory mock of the §5.1 API first, so it does not
   wait on step 1. Then switched to the proxy.
3. **Staging**: a Vercel preview of `v3` plus a staging Railway service, on the **same production database**
   (owner, 2026-10-19: keep the DB the same). So: migration 009 must be additive and safe for V2 (it runs when
   the staging service deploys); the end-to-end run uses the owner's own account and creates `board_version=3`
   boards that V2 never lists; agents never connect to this database, the owner runs the staging checks.
   Local development and engine tests use a local Docker pgvector (`TEST_DATABASE_URL`).
4. **Switch**: the owner deploys backend `v3` first (additive, safe for V2), then turns the flag on in prod.
5. **Cleanup** (after a week without incidents): delete the V2 Next DB routes and `lib/mongodb.ts`, and stop
   writing `canvases.data` except `viewport`.

Tests that must exist before the switch:
- Engine: read-set cases mirroring the prototype seed (desk, wire, answer, inherit on/off, hide, pile), the
  lineage-edge-only fork fallback, carry modes, the ownership check on ingest, and position batches.
- Board: the 24 Playwright checks from the prototype plus the make-room checks
  (`docs/design/prototype-tests/v4test.js`, `room.js`), ported to run against the mock API, plus one end-to-end run on staging (create board → drop PDF → ask → branch → string an answer →
  reload → same layout).

## 10. Calls Claude made (owner to check)

- Delete a chat = it and its branches, soft, with one confirm and Undo (§5.1).
- Upload cap 4 MB in V3.0 because of Vercel's body limit (§6).
- The board engine is a TypeScript port of the prototype, not xyflow (§7).
- V3 lives in the same Next.js app behind a flag, with per-board URLs `/b/[boardId]` (§7).
- No websockets; the board polls while a source is processing (§6).
- "Click a string → Disconnect pill" stays (DECISIONS row 47, still unconfirmed).

## 11. Builder's calls (left open)

- Module boundaries inside `components/board/engine/`, file names, and how the prototype's globals become
  module state.
- Exact clip lengths and chunk sizes not fixed above.
- Whether `GET /boards/{b}` embeds the last message preview per chat (it should, if cheap).

## 12. Owner answers (2026-10-19)

1. **Old boards**: start fresh. V2 canvases are not migrated (§8).
2. **Release**: V3 replaces V2 at contexttree.tech when ready.
3. **Video, image, audio reading**: "coming soon" in V3.0 (§6). Cards can be added; chats don't read them yet.
4. **Database**: keep the same database; no separate staging database (§9).
