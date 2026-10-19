# V3 Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the V3 board (board-frontend plan) to the V3 engine (engine plan) through one authenticated
Next.js proxy. Give boards their own URLs and a board list, prove the whole loop end to end on a local stack,
and prepare the switch and the V2 cleanup.

**Architecture:** The browser calls only `/api/engine/*`. That catch-all route checks the NextAuth session,
mints the 60 s backend JWT and streams the request and response through to FastAPI. `HttpEngineApi`
implements the `EngineApi` interface over that proxy. The board pages (`/boards`, `/b/[boardId]`) mount
`<Board api={new HttpEngineApi()} … />`. The V2 studio stays at `/` until the flag flips.

**Tech Stack:** Next.js 16 route handlers (Node runtime), NextAuth v4 (database sessions), `jose` JWT,
vitest, Playwright, FastAPI engine (local), Docker pgvector (local).

**Spec:** `docs/superpowers/specs/2026-10-19-v3-board-design.md` (§5.1 proxy, §7 where it lives, §9 rollout).
**Contract:** `docs/superpowers/plans/2026-10-19-v3-api-contract.md`.
**Sibling plans:** `2026-10-19-v3-engine.md` (ContextTree repo), `2026-10-19-v3-board-frontend.md`.

## Global Constraints

- The browser never talks to FastAPI directly, and V3 code never imports `lib/mongodb.ts` or calls `/api/canvases/*`.
- Identity comes only from the NextAuth session. JWT `sub` = `user.email` (`lib/backend-jwt.ts`, TTL 60 s). No user field is forwarded in bodies.
- Upload cap is 4 MB, checked in the browser before sending and enforced by the engine (413 `too_large`).
- The board is light-only (Pebble). Board routes render light even though the app's `ThemeProvider` defaults to dark.
- Flag `NEXT_PUBLIC_BOARD_V3=1` sends signed-in users from `/` to `/boards`. When it is unset, `/` is the V2 studio, unchanged.
- V2 files stay untouched until Task 7, and Task 7 runs only after the owner says so.
- Agents never connect to the production database and never push or deploy. The owner deploys.
- Commits: `type(scope): summary`, then `Why:` and `Refs:` lines, then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Run `bash "C:/Users/chinm/.claude/plugins/cache/ckic-plugins/ckic/c681772b0c0e/scripts/secret-scan.sh"` before every commit. Frontend work goes on branch `v3` of ContextTree-src; engine work goes on branch `v3` of ContextTree.

## Dependencies

```
Board-frontend plan: types.ts + vitest + Playwright config ──┐
Engine plan: board router + chat changes ────────────────────┼─▶ T1 proxy ─▶ T2 HttpEngineApi ─▶ T3 pages ─▶ T4 BYOK/model lock
                                                              │                                      │
Engine plan done ──▶ T5 engine fake-LLM mode ─────────────────┴──────────────────────────────────────┴─▶ T6 live e2e ─▶ T7 switch + cleanup (owner-gated)
```

T1 and T2 can start once the board-frontend plan's `components/board/api/types.ts` exists. They test against
mocked `fetch` and do not need the engine. T5 runs in the engine repo and can go in parallel with T1–T4.

## Review Focus

1. **Session expires mid-session.** The proxy returns 401, so `HttpEngineApi` throws `ApiError(401)` and the board shows "Signed out — sign in again" with a link. It must not retry in a loop or drop unsaved positions silently. Test in T2.
2. **Engine down or slow (Railway cold start).** A fetch failure returns 503 `engine_unavailable` from the proxy, not a hung request. The board keeps its optimistic state and marks the card "not saved". Tests in T1 and T2.
3. **Large or odd uploads.** A 5 MB file is refused in the browser with no request sent. A file with no extension or MIME type is passed through to the engine, which answers with a clean 415. Test in T2.
4. **Stream cut mid-answer.** The SSE body ends without `[DONE]`. `streamChat` resolves after emitting `{type:'error', message:'The answer was cut off'}`; it does not hang. Test in T2.
5. **Someone opens another user's board URL.** The engine returns 404, and the page shows "This board doesn't exist or isn't yours" plus a link to `/boards`, not a crash. Test in T6.

---

### Task 1: Engine proxy route

**Files:**
- Create: `lib/engine-base.ts`
- Create: `app/api/engine/[...path]/route.ts`
- Test: `tests/unit/engine-proxy.test.ts`

**Interfaces:**
- Consumes: `mintBackendToken(sub: string): Promise<string>` (`lib/backend-jwt.ts`), `getCurrentUser()` (`lib/auth-utils.ts`), `resolveLlmApiUrl()` and `isKnownUntrustedSSL()` (`lib/llm-backend.ts`).
- Produces: `resolveEngineBase(): string | undefined`, which returns the `LLM_API_URL` result with everything from `/chat` onward removed and no trailing slash. The route answers to `GET | POST | PATCH | DELETE /api/engine/<path>`.

- [ ] **Step 1: Write the failing tests.** Mock `getCurrentUser`, `mintBackendToken` and global `fetch`:
  - `resolveEngineBase` with `LLM_API_URL="https://x.app/api/v1/chat"` → `"https://x.app"`. With `"http://localhost:8000/api/v1/chat/"` → `"http://localhost:8000"`.
  - No session → 401 `{error:"unauthorized"}`, and `fetch` is not called.
  - `GET /api/engine/boards?x=1` → fetch to `https://x.app/api/v1/boards?x=1` with header `Authorization: Bearer <token>`. The `mintBackendToken` mock is called with `"a@b.c"`.
  - The request body is forwarded as a stream with the original `content-type`, including `multipart/form-data; boundary=…`. Check that `duplex: "half"` is set.
  - The upstream status and body pass through unchanged: 409 `{error:"card_limit"}` comes back as 409 with the same JSON.
  - An upstream `text/event-stream` comes back with `Cache-Control: no-cache, no-transform` and `X-Accel-Buffering: no`.
  - `fetch` throws → 503 `{error:"engine_unavailable"}`.
  - Path traversal: `/api/engine/..%2Fadmin` → 400 `{error:"invalid"}`. Only segments matching `^[A-Za-z0-9_.-]+$` are allowed, and never `..`.
  - Hop-by-hop and auth headers from the browser (`cookie`, `authorization`, `host`, `connection`) are not forwarded.
- [ ] **Step 2: Run them and see them fail.** Run: `npx vitest run tests/unit/engine-proxy.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement.** `export const runtime = "nodejs"` and `export const dynamic = "force-dynamic"`. One `handler(req, { params })` is exported as GET, POST, PATCH and DELETE. Reuse the untrusted-SSL agent rule from `app/api/llm/route.ts`. Upstream timeout: 30 s for JSON, none for `text/event-stream` responses (decide by the `accept` header or the path `chat/stream`).
- [ ] **Step 4: Run them and see them pass.** Same command. Expected: all PASS.
- [ ] **Step 5: Commit.** `feat(api): single engine proxy for V3`.

### Task 2: HttpEngineApi

**Files:**
- Create: `components/board/api/http.ts`
- Create: `lib/sse.ts` (SSE line parser, also usable by V2 later)
- Test: `tests/unit/http-engine-api.test.ts`, `tests/unit/sse.test.ts`

**Interfaces:**
- Consumes: `EngineApi`, `ApiError` and the contract types from `components/board/api/types.ts` (board-frontend plan).
- Produces:
  - `class HttpEngineApi implements EngineApi { constructor(base = "/api/engine") }`
  - `parseSse(chunk: string, carry: string): { events: unknown[]; carry: string; done: boolean }`
  - `MAX_UPLOAD_BYTES = 4 * 1024 * 1024`

- [ ] **Step 1: Write the failing tests.**
  - `sse.test.ts`:
    - Two frames split across chunks (`'data: {"message":"Hel'`, then `'lo"}\n\ndata: [DONE]\n\n'`) → one event `{message:"Hello"}`, then `done: true`.
    - A `\r\n` line ending parses the same.
    - A non-JSON `data:` line is skipped.
  - `http-engine-api.test.ts`, with `fetch` mocked:
    - Each `EngineApi` method hits the contract's method and path. Table-driven: `createCard("b1", …)` → `POST /api/engine/boards/b1/cards` with a JSON body; `savePositions` → `PATCH /api/engine/boards/b1/positions` with body `{positions:[…]}`; `deleteCard` returns the `deleted` array.
    - A non-2xx response throws `ApiError` with `status` and `code` taken from the body `{error}`. A 503 with no body gets code `"engine_unavailable"`.
    - `uploadFile` with a 5 MB `File` throws `ApiError(413, "too_large")`, and `fetch` is not called.
    - `uploadFile` sends `FormData` with the fields `id`, `file`, `x`, `y`, plus `deskId` and `desc` only when they are set.
    - `streamChat` maps the frames: `{message}` → `{type:"delta"}`, `{summary}` → `{type:"summary"}`, `{web_search:{results}}` → `{type:"web"}`, `{error}` → `{type:"error"}`, `[DONE]` → `{type:"done"}`. The request body uses the V2 field names: `nodeId: chatId`, `message_id: messageId`, `canvasId: boardId`, plus `boardId: boardId` (this marks the turn as V3; contract clarifications).
    - Review Focus 4: a body that ends without `[DONE]` → the last event is `{type:"error", message:"The answer was cut off"}` and the promise resolves.
    - An aborted `signal` → the promise rejects with `AbortError`, and no `error` event is emitted.
    - `rawFileUrl("c_1")` → `"/api/engine/files/c_1/raw"`.
    - Review Focus 1: a 401 throws `ApiError(401, "unauthorized")`.
- [ ] **Step 2: Run them and see them fail.** Run: `npx vitest run tests/unit/sse.test.ts tests/unit/http-engine-api.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Port the SSE loop from `components/contextual-console.tsx:927-1004` into `parseSse` (do not change V2). `streamChat` posts to `/api/engine/chat/stream`.
- [ ] **Step 4: Run them and see them pass.** Same command. Expected: PASS.
- [ ] **Step 5: Commit.** `feat(board): HttpEngineApi over the engine proxy`.

### Task 3: Board pages, board list and the flag

**Files:**
- Create: `app/boards/page.tsx` (board list)
- Create: `app/b/[boardId]/page.tsx` (one board)
- Create: `components/board/board-list.tsx`, `components/board/board-route.tsx` (client wrapper: session gate, light scope, error states)
- Modify: `app/page.tsx`. Its signed-in branch does `router.replace("/boards")` when `process.env.NEXT_PUBLIC_BOARD_V3 === "1"`. Nothing else in the file changes.
- Test: `e2e/integration/routes.spec.ts` (runs against the mock; see Step 1)

**Interfaces:**
- Consumes:
  - `<Board api boardId onOpenBoard? onOpenSettings? />` from `components/board/Board.tsx` (board-frontend plan); `onOpenBoard(id)` routes to `/b/<id>`, `onOpenSettings()` opens `ApiKeySettingsDialog`
  - `MockEngineApi` and `SEED_BOARD_ID` from `components/board/api/mock/mock-engine-api.ts`
  - `HttpEngineApi` (T2), `useAuth()` (`hooks/use-auth.ts`)
- Produces:
  - `<BoardList api={EngineApi} />` lists boards newest first.
    - "New board" calls `createBoard({id: newId("b"), title: "Untitled board"})`, then routes to `/b/<id>`.
    - Each row has rename (`updateBoard`) and delete (`deleteBoard` after a confirm sheet, then a 10 s Undo toast). Undo is a client-side deferral: the DELETE is sent when the toast expires.
  - `<BoardRoute boardId>` behaves as follows:
    - Loading: shows the Pebble loader.
    - Signed out: redirects to `/auth/signin?callbackUrl=/b/<id>`.
    - `ApiError(404)`: shows "This board doesn't exist or isn't yours." with a "Your boards" link.
    - `ApiError(503)`: shows "Can't reach Context Tree right now." with "Try again".
  - On the board routes, the light theme wraps the route in `<ThemeProvider forcedTheme="light" attribute="class">` (`components/theme-provider.tsx`).
  - A dev-only switch, `?api=mock` on `/b/[boardId]` when `NODE_ENV !== "production"`, mounts `MockEngineApi` instead. This lets the e2e run without an engine.

- [ ] **Step 1: Write the failing e2e test** (Playwright, against `next dev` with `?api=mock`, signed-in state mocked through the board-frontend plan's dev page pattern):
  - `/b/b_seed?api=mock` renders `[data-board="b_seed"]` with 4 chats (`SEED_BOARD_ID`).
  - `/b/missing?api=mock` shows the text "This board doesn't exist or isn't yours".
  - `/boards?api=mock` → "New board" → the URL matches `/b/b_[a-z0-9]+_[a-z0-9]{6}`.
  - The computed `background-color` of `body` on `/b/b_seed?api=mock` equals the Pebble board token (lilac), not the V2 dark background. `BoardRoute` sets it: the board paints only inside `.pb-root`.
- [ ] **Step 2: Run it and see it fail.** Run: `npx playwright test e2e/integration/routes.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the pages, components and flag redirect described above.
- [ ] **Step 4: Run it and see it pass.** Same command, plus `npx tsc --noEmit -p .`, which must show no new errors in `app/b`, `app/boards` or `components/board`.
- [ ] **Step 5: Commit.** `feat(board): board list, per-board URLs and the V3 flag`.

### Task 4: BYOK and model lock in the board

**Files:**
- Create: `components/board/account-menu.tsx` (avatar, Your boards, API keys, sign out)
- Modify: `components/board/chrome/ModelPicker.tsx` (`{ value, onChange }`) and `components/board/lib/catalog.ts` (`MODELS`), both from the board-frontend plan
- Test: `tests/unit/model-lock.test.ts`

**Interfaces:**
- Consumes:
  - `ApiKeySettingsDialog` (`components/api-key-settings-dialog.tsx`), reused as is
  - `useByokStatus()` (`hooks/use-byok-status.ts`)
  - the model table in `lib/models.ts` (`requiresByok`, `byokProvider`)
  - the board-frontend plan's model map (prototype key → engine id)
- Produces: `isModelLocked(engineModelId: string, providers: Record<string, {configured: boolean}>): boolean`. A locked model shows "Add your key" in the picker, and clicking it opens `ApiKeySettingsDialog` on that provider's tab.

- [ ] **Step 1: Write the failing test.**
  - `isModelLocked("anthropic/…", {anthropic:{configured:false}})` → true.
  - With `configured:true` → false.
  - A model with no `requiresByok` → false.
- [ ] **Step 2: Run it and see it fail.** Run: `npx vitest run tests/unit/model-lock.test.ts`.
- [ ] **Step 3: Implement** `isModelLocked` and the account menu, and mount the menu at the board's top-right corner (Pebble chrome; must not be a floating toolbar above nodes, DECISIONS row 23).
- [ ] **Step 4: Run it and see it pass.** Also take a manual screenshot check on `/b/b_seed?api=mock`: the menu opens, and "API keys" opens the dialog.
- [ ] **Step 5: Commit.** `feat(board): account menu with BYOK and model locks`.

### Task 5: Engine fake-LLM mode for end-to-end runs (ContextTree repo)

**Files:**
- Modify: `app/agent/helpers/get_llm.py` (`get_llm`, around line 527)
- Modify: `app/agent/utils/embeddings.py` (`get_embedding`, `get_embeddings`)
- Modify: `app/core/config.py` (setting `ENGINE_FAKE_LLM: bool = False`)
- Test: `tests/test_fake_llm_mode.py`

**Interfaces:**
- Produces:
  - When `ENGINE_FAKE_LLM=1`, `get_llm(...)` returns a `langchain_core` `GenericFakeChatModel` whose output for a question `q` is `"Fake answer to: " + q[:60]`. It streams word by word.
  - `get_embedding(text)` returns a deterministic 768-dim unit vector built from `hashlib.sha256(text)`.
  - When `RAILWAY_ENVIRONMENT` or `RAILWAY_PROJECT_ID` is set, the engine refuses to start with `ENGINE_FAKE_LLM=1` (`RuntimeError("ENGINE_FAKE_LLM is for local runs only")`).

- [ ] **Step 1: Write the failing tests.**
  - Fake mode on: `get_llm("anthropic/x").invoke("hi").content.startswith("Fake answer to:")`.
  - `get_embedding("a") == get_embedding("a")`, has length 768, and has norm ≈ 1.
  - With `RAILWAY_ENVIRONMENT=production` and fake mode on, the settings check raises.
- [ ] **Step 2: Run them and see them fail.** Run: `.venv/Scripts/python.exe -m pytest tests/test_fake_llm_mode.py -q`.
- [ ] **Step 3: Implement** the setting, the guard and both branches.
- [ ] **Step 4: Run them and see them pass.** Run the whole no-DB suite as well: `.venv/Scripts/python.exe -m pytest tests/test_fake_llm_mode.py tests/test_memory_facts.py tests/test_reasoning_stream.py -q`. Expected: PASS.
- [ ] **Step 5: Commit** on ContextTree `v3`: `test(engine): fake LLM and embeddings for local end-to-end runs`.

### Task 6: Live end-to-end on the local stack

Depends on everything above, plus the engine plan and the board-frontend plan being complete.

**Files:**
- Create: `e2e/integration/live.spec.ts`
- Create: `e2e/integration/seed-session.ts`, which inserts a test user and a NextAuth `sessions` row into the **local** test database and returns the cookie value
- Create: `scripts/dev-stack.md`, the exact commands to bring the stack up

**Stack** (all local; nothing touches prod):
- Docker pgvector: `ctx-pg` on `localhost:55432`, database `v3e2e`, migrations 001–009 applied with the engine's `scripts/migrate.py`.
- Engine: `DATABASE_URL=<local> ENGINE_FAKE_LLM=1 BACKEND_JWT_SECRET=e2e-only-secret .venv/Scripts/python.exe main.py` on :8000.
- Next: `DATABASE_URL=<local> BACKEND_JWT_SECRET=e2e-only-secret LLM_API_URL=http://localhost:8000/api/v1/chat NEXTAUTH_URL=http://localhost:3000 NEXTAUTH_SECRET=e2e-only NEXT_PUBLIC_BOARD_V3=1 npm run dev`.
- `seed-session.ts` refuses to run unless `DATABASE_URL` contains `localhost` (same rule as `scripts/verify-edge-scoped.ts`).
- The test user is `e2e@contexttree.test`. Its session token is generated by the script and never printed.

- [ ] **Step 1: Write the test.** It sets the session cookie, then goes through these steps in order and asserts each one through the UI. After step 7 it checks again through `GET /api/engine/boards/<id>`.
  1. `/` redirects to `/boards`.
  2. "New board" → the URL is `/b/…`.
  3. Type a question in the first chat → the stream renders "Fake answer to:".
  4. Drop `e2e/fixtures/pricing.pdf` (a small PDF in the repo) onto the chat → the card shows a processing state, then ready within 20 s.
  5. Drag the chat's out-port to empty board → the branch sheet opens → Branch → the new chat answers.
  6. String the first chat's answer into the branch → `GET …/reads` for the branch contains an `answer` item.
  7. Move a card and wait 1 s → reload → the card is at the same position (±1 px).
  8. Delete the branch → Undo → it is back.
  9. Review Focus 5: open `/b/<id-of-another-user>` → "This board doesn't exist or isn't yours". Set this up by seeding a second user's board through the API with that user's token.
  10. Paste a YouTube link → the card shows "coming soon", and `GET …/reads` marks it `state: "soon"`.
- [ ] **Step 2: Bring the stack up** following `scripts/dev-stack.md`. Run: `npx playwright test e2e/integration/live.spec.ts`. Expected: PASS. Fix the failures in the owning plan's files, with a note in the commit about which plan's task they belong to.
- [ ] **Step 3: Commit.** `test(e2e): V3 board end to end on a local stack`.

### Task 7: Switch and V2 cleanup (owner-gated)

Not started until the owner says so in chat.

- [ ] **Step 1: Write the switch checklist** in `docs/superpowers/plans/v3-switch-checklist.md`. These are owner actions, in order:
  1. Push both `v3` branches.
  2. Deploy the engine `v3` on Railway. Migration 009 runs on start; it is additive, so V2 is unaffected. Check `/api/v1/health/`.
  3. Open a Vercel preview of the frontend `v3` with `NEXT_PUBLIC_BOARD_V3=1`, against prod. Run through the live spec's steps 2–10 by hand on your own account.
  4. Merge both branches to `main`. Set `NEXT_PUBLIC_BOARD_V3=1` in Vercel production. Redeploy.
  5. Watch for a week. Each day, check Railway logs for 5xx on `/api/v1/boards`.
- [ ] **Step 2: After the week, and only on the owner's go**, delete these and nothing else:
  - the V2 Next data routes: `app/api/canvases/**`, `app/api/upload`, `app/api/files/**`, `app/api/llm/**`
  - the canvas/node/edge/message/file methods of `lib/mongodb.ts` and the canvas parts of `lib/storage.ts`
    (the BYOK key, user and bug-report methods stay, because `app/api/user-api-keys`, `app/api/me` and `app/api/admin` still use them)
  - `components/canvas`, `components/nodes`, `components/contextual-console.tsx`, `components/console`, `components/compare`
  - the V2 branch of `app/page.tsx`

  Keep `app/api/user-api-keys`, `app/api/me`, `app/api/admin`, auth and the landing page. `npx tsc --noEmit` and `npm run build` must pass.
- [ ] **Step 3: Commit.** `refactor(app): remove V2 studio and Next data writers`. Update `context/ARCHITECTURE.md` and `context/STATE.md` in the same commit.
