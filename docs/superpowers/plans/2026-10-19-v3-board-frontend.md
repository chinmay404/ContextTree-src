# V3 Board Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Pebble prototype (`docs/design/pebble-desks-prototype.html`) into the Next.js app as a TypeScript board, `<Board api={EngineApi} boardId=… />`, running against an in-memory `MockEngineApi`, so that it looks and moves the same as the prototype and passes the prototype's acceptance checks.

**Architecture:** A framework-free engine under `components/board/engine/` (springs, camera, frame loop, cards, desks, strings, piles, drag) renders the board into the DOM imperatively, exactly as the prototype does. React owns only the chrome (sheets, viewers, focus view, menus, zoom, trail, toasts). One store (`components/board/store.ts`) is the only holder of board data: it talks to `EngineApi`, applies optimistic changes per entity and reconciles per entity. The engine and the chrome both read the store and call its actions; the engine never calls the API.

**Tech Stack:** Next 16.1, React 19, TypeScript 5 (strict), plain CSS (`pebble.css`, not Tailwind), `next/font/google` (Bricolage Grotesque), `lucide@0.460.0` (vanilla icons, same set the prototype loads), Vitest 3 (+ jsdom where a test needs a DOM), Playwright Test against `next dev`.

**Spec:** `docs/superpowers/specs/2026-10-19-v3-board-design.md` (§7 all, §9 board tests), `context/DECISIONS.md` rows dated 2026-10-19, and the binding contract `docs/superpowers/plans/2026-10-19-v3-api-contract.md`. The prototype file is the visual and behavioural source of truth: every task names the prototype line range it ports. Executors read the cited lines before writing code and copy every numeric constant from them (spring periods and damping, gaps, paddings, timings); nothing is retuned.

**Not in this plan** (integration plan): `HttpEngineApi`, the Next proxy `app/api/engine/[...path]`, auth, the `/b/[boardId]` route, the `NEXT_PUBLIC_BOARD_V3` flag, mounting the V2 BYOK dialog. This plan only makes the board mountable and gives it the two callbacks the integration needs (`onOpenBoard`, `onOpenSettings`).

**Precondition:** the controller resolves "Contract changes requested" (end of this plan) before Task 2. Each request names the fallback to use if it is rejected.

## Global Constraints

- The board talks only to `EngineApi` from `components/board/api/types.ts`; that file holds the contract's types verbatim. No `fetch` anywhere under `components/board/`.
- No `@xyflow/react`, `reactflow` or `dagre` import under `components/board/` (spec §7).
- V2 stays untouched: no edits to `components/canvas/`, `components/nodes/`, `components/contextual-console.tsx` or any other existing component, `lib/`, or `app/` file. Allowed edits outside new files: `package.json`, `package-lock.json`, `.gitignore`, `middleware.ts` (dev route only).
- Store merges are per entity (`{id, changes}`); never replace the whole board from a fetched snapshot. A card created in the browser stays pinned until a server snapshot contains it.
- Position saves: 600 ms after the last spring settles, one `savePositions` call carrying every moved card, including cards moved by makeRoom / separateDesks (≤ 200 per call; split above that).
- Poll `getBoard` every 2 s while any card has `status: 'processing'`; stop when none does.
- Upload cap 4 MB (`413 too_large`). Card cap 50 live cards per board, sources included (`409 card_limit`).
- Ids: `<prefix>_<Date.now() base36>_<6 random [a-z0-9]>`, prefixes `b` board, `c` card, `e` edge. Message ids as V2 `genId()`: `Math.random().toString(36).slice(2, 10) + Date.now().toString(36)`, stored as `<id>_u` / `<id>_a`.
- Pebble styles live in `components/board/pebble.css`, scoped under `.pb-root`, light only, tokens copied from prototype lines 11–25. They never touch the V2 Tailwind theme. After Task 6, `pebble.css` is frozen: a later task that needs new rules adds `components/board/chrome/<feature>.css`, imported by its own component.
- Font: Bricolage Grotesque through `next/font/google` (variable font, `opsz` axis), exposed as `--pb-font`.
- Reduced motion: springs snap to target (prototype `RM`, line 384); the slide on pile flip and the focus-view morph are skipped. CSS honours it per component, not with the prototype's blanket `*` override (line 357). Looping animations become `animation: none`; opacity and colour transitions stay (vault: *A blanket reduced-motion override can create a strobe*).
- `status: 'soon'` (video, image, audio): the card shows a pill reading `Coming soon`, its desk dot is hollow, no chat reads it. Viewer copy: `Reading videos is coming soon` / `Reading audio is coming soon` / `Reading images is coming soon`.
- Delete copy: `Delete Q2 and its 3 branches? Sources on their desks stay on the board.` (singular `1 branch`; with no branches: `Delete Q2? Sources on its desk stay on the board.`). Undo toast lasts 10 000 ms and calls `restoreCard`. Sources and piles: Undo only, no confirm.
- Dev page `/board-dev` returns 404 when `NODE_ENV === 'production'`. `window.__board` exists only when `NODE_ENV !== 'production'` and `<Board testHook />`.
- DOM contract: card and chrome selectors listed in Task 9 are fixed; tests and components use exactly those.
- Commits: on branch `v3`, never push. Format: `type(scope): summary`, blank line, `Why: …`, `Refs: context/DECISIONS.md 2026-10-19 | docs/superpowers/plans/2026-10-19-v3-board-frontend.md Task N`, blank line, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Run `bash "C:/Users/chinm/.claude/plugins/cache/ckic-plugins/ckic/c681772b0c0e/scripts/secret-scan.sh"` before every commit; it must exit 0.
- Never read or copy `.env*`, `DB.txt`, `*.pem`, `V2/08-CHECKPOINT.md`.

## Review Focus

1. **The API refuses an optimistic change** (409 `not_allowed` on a string, 400 on a desk move, a network error): only that entity goes back to its last server copy, a toast says why, and unrelated changes still pending survive. Pinned by Task 7 `a failed patch restores only that card's server copy` and Task 11 `a refused string disappears with a toast`.
2. **A poll snapshot arrives while a local change is unsaved** (a dragged card before its 600 ms save, a create in flight, a desk patch in flight): nothing snaps back and nothing disappears. Pinned by Task 7 `stale snapshot keeps pending patch and pinned create` and Task 18 `a poll during an unsaved move does not snap the card back`.
3. **A re-render lands while the user types** (in the chat composer, a note, or "What is this for?") because reads, a poll or a stream changed something: the text, focus and caret stay. Pinned by Task 9 `typing survives a re-render`.
4. **Reduced motion is on**: cards land on their target at once, and no looping animation runs (no strobe). Pinned by Task 4 `snaps instead of animating when reduced motion is on` and Task 9 `reduced motion: no looping animation, cards land at once`.
5. **Adding something the board can't take** (a 5 MB file, a `.mov`, the 51st card): nothing half-made stays on the board, and the toast says what happened. Pinned by Task 7 `card_limit removes the optimistic card with the full-board toast` and Task 16 `rejected uploads leave no card and say why`.

---

## Dependency graph

```
Task 1 tooling
├── Task 2 contract types, catalog, graph, read set, seed
│   └── Task 3 MockEngineApi
│       └── Task 7 store: data
│           └── Task 8 store: UI, chat, delete
├── Task 4 springs, camera, frame loop
│   └── Task 5 layout geometry (makeRoom, separateDesks, freeSpot)
└── Task 6 pebble.css, fonts, icons, markdown
Task 9 board shell + engine + cards + drag + test hook   ← Tasks 5, 6, 8
Tasks 10–19 (parallel, each ← Task 9):
  10 desks · 11 strings · 12 piles · 13 viewers · 14 branch sheet · 15 focus view + compare
  16 adding things · 17 zoom, trail, brand · 18 persistence · 19 delete + undo UI
Task 20 acceptance port (v4test.js + room.js) ← Tasks 10–19
```

Waves: W1 = 1 · W2 = 2, 4, 6 · W3 = 3, 5 · W4 = 7 · W5 = 8 · W6 = 9 · W7 = 10–19 · W8 = 20.

Parallel-safety rules for W7: Task 9 creates every engine module and chrome component as a stub with its final signature, plus the test hook, the e2e helpers and the escape stack. W7 tasks fill their own files only. They do not edit `store.ts`, `pebble.css`, `engine/board-engine.ts`, `engine/test-hook.ts`, `Board.tsx` or `e2e/board/helpers.ts`. If one of them needs to, the plan has a gap: stop and report it rather than editing a shared file.

## File map

```
components/board/
  api/types.ts                 contract types + EngineApi + ApiError (Task 2)
  api/ids.ts                   newId, genMessageId (Task 2)
  api/mock/seed.ts             prototype seed board + messages (Task 2)
  api/mock/mock-engine-api.ts  MockEngineApi (Task 3)
  lib/catalog.ts               source types, families, colours, MODELS table, PERSONAS, defaults (Task 2)
  lib/graph.ts                 pure graph queries over cards/edges (Task 2)
  lib/reads.ts                 computeReads — the prototype's ctx() (Task 2)
  lib/merge.ts                 per-entity merge + reconcile (Task 7)
  lib/markdown.ts              safe markdown subset → HTML (Task 6)
  lib/format.ts                cut, strip, sizeOf, formatWhen (Task 6)
  engine/spring.ts camera.ts loop.ts        (Task 4)
  engine/geometry.ts                        (Task 5)
  engine/icons.ts                           (Task 6)
  engine/types.ts board-engine.ts card-view.ts drag.ts test-hook.ts   (Task 9)
  engine/desks.ts strings.ts piles.ts persistence.ts   (stubs Task 9; filled 10, 11, 12, 18)
  store.ts                                  (Tasks 7, 8)
  context.tsx Board.tsx fonts.ts pebble.css (Tasks 6, 9)
  chrome/escape.ts Icon.tsx                 (Task 9)
  chrome/BranchSheet.tsx branch-estimate.ts (14) · SourceViewer.tsx viewer-bodies.tsx (13)
  chrome/FocusView.tsx CompareSheet.tsx (15) · AddMenu.tsx DropOverlay.tsx BoardInput.tsx (16)
  chrome/ZoomControl.tsx TrailBar.tsx BrandBar.tsx (17) · DeleteConfirm.tsx Toast.tsx (19)
app/board-dev/page.tsx board-dev.tsx        (Tasks 1, 9)
e2e/board/*.spec.ts helpers.ts global.d.ts  (Tasks 1, 9, 10–20)
vitest.config.ts playwright.config.ts tsconfig.board.json   (Task 1)
```

Unit tests live next to their module as `*.test.ts`.

---

### Task 1: Test tooling and the dev page shell

**Files:**
- Create: `vitest.config.ts`, `playwright.config.ts`, `tsconfig.board.json`, `app/board-dev/page.tsx`, `app/board-dev/board-dev.tsx`, `app/board-dev/page.test.tsx`, `e2e/board/dev-page.spec.ts`
- Modify: `package.json` (scripts, devDependencies), `.gitignore`, `middleware.ts` (the `authorized` allow-list)

**Interfaces:**
- Produces: `npm test` (vitest run), `npm run test:e2e` (playwright test), `npm run typecheck:board` (`tsc -p tsconfig.board.json --noEmit`). `app/board-dev/page.tsx`: `export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> })`. It calls `notFound()` in production and otherwise renders `<BoardDev params={…} />`. `board-dev.tsx` is a `'use client'` placeholder (`<div data-pb="board-dev" />`); Task 9 replaces its body.

- [ ] **Step 1: Install tooling**

Run: `npm i -D vitest@^3.2.4 jsdom@^26.1.0 @playwright/test@1.61.1 && npx playwright install chromium`. `@playwright/test` must equal the installed `playwright` (1.61.1, `npm ls playwright`).
Expected: the install exits 0 and `npx vitest --version` prints 3.x.

- [ ] **Step 2: Config files**

`vitest.config.ts`: `environment: 'node'`, `include: ['components/board/**/*.test.ts', 'components/board/**/*.test.tsx', 'app/board-dev/**/*.test.tsx', 'tests/unit/**/*.test.ts']`. The integration plan puts its unit tests in `tests/unit/`. Its Playwright specs live in `e2e/integration/`, which `testDir: 'e2e'` already covers. `resolve.alias: { '@': <repo root> }`, `esbuild: { jsx: 'automatic' }`. Tests that need a DOM put `// @vitest-environment jsdom` on line 1.
`playwright.config.ts`: `testDir: 'e2e'`, `timeout: 60_000`, `expect.timeout: 10_000`, `workers: process.env.CI ? 1 : 2`, `use: { baseURL: 'http://localhost:3100', viewport: { width: 1440, height: 900 } }`, `webServer: { command: 'npx next dev --port 3100', url: 'http://localhost:3100/board-dev', reuseExistingServer: !process.env.CI, timeout: 180_000 }`, `outputDir: 'test-results/board'`.
`tsconfig.board.json`: extends `./tsconfig.json`, `include: ['components/board/**/*', 'app/board-dev/**/*', 'e2e/**/*', 'tests/unit/**/*', 'vitest.config.ts', 'playwright.config.ts', 'next-env.d.ts']`. It exists because `next.config.mjs` sets `ignoreBuildErrors` and V2 is not type-clean.
Scripts: `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:e2e": "playwright test"`, `"typecheck:board": "tsc -p tsconfig.board.json --noEmit"`.
`.gitignore`: add `/test-results/` and `/playwright-report/`.

- [ ] **Step 3: Write the failing tests**

```tsx
// app/board-dev/page.test.tsx
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NEXT_NOT_FOUND'); } }));
it('404s in production', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  const { default: Page } = await import('./page');
  await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow('NEXT_NOT_FOUND');
});
it('renders in development', async () => {
  vi.resetModules(); vi.stubEnv('NODE_ENV', 'development');
  const { default: Page } = await import('./page');
  expect(await Page({ searchParams: Promise.resolve({}) })).toBeTruthy();
});
```
```ts
// e2e/board/dev-page.spec.ts
test('dev page is reachable without signing in', async ({ page }) => {
  const res = await page.goto('/board-dev');
  expect(res!.status()).toBe(200);
  expect(page.url()).toContain('/board-dev');
});
```

- [ ] **Step 4: Run to verify they fail**

Run: `npx vitest run app/board-dev` and `npx playwright test e2e/board/dev-page.spec.ts`
Expected: FAIL (`./page` not found; the e2e test redirects to sign-in).

- [ ] **Step 5: Implement the page, placeholder and middleware allow-list**

In `middleware.ts`, add `(process.env.NODE_ENV !== 'production' && pathname === '/board-dev')` to the public-route condition. The page converts `searchParams` into numbers (`ingestMs`, `firstTokenMs`, `wordMs`, `latencyMs`, `toastMs`) for `<BoardDev params>`.

- [ ] **Step 6: Run to verify they pass**

Run: `npm test && npx playwright test e2e/board/dev-page.spec.ts && npm run typecheck:board`
Expected: all PASS, tsc exits 0.

- [ ] **Step 7: Commit**

Run the secret scan, then:
```bash
git add vitest.config.ts playwright.config.ts tsconfig.board.json package.json package-lock.json .gitignore middleware.ts app/board-dev e2e/board/dev-page.spec.ts
git commit -m "chore(board): vitest, playwright and the /board-dev page" -m "Why: the board is built test-first against a dev-only page that mounts the mock API (spec §9)." -m "Refs: context/DECISIONS.md 2026-10-19 | docs/superpowers/plans/2026-10-19-v3-board-frontend.md Task 1" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Contract types, catalog, graph queries, read set, seed

Ports prototype lines 399–442 (types, MODELS, PERSONAS, DEFAULT_ADV, helpers, `tokensOf`, `ctx`, `readsOf`, `canPlug` 630–634) and the seed 1262–1280.

**Files:**
- Create: `components/board/api/types.ts`, `components/board/api/ids.ts`, `components/board/lib/catalog.ts`, `components/board/lib/graph.ts`, `components/board/lib/reads.ts`, `components/board/api/mock/seed.ts`
- Test: `components/board/api/ids.test.ts`, `components/board/lib/graph.test.ts`, `components/board/lib/reads.test.ts`

**Interfaces:**
- Produces (`api/types.ts`): every type in the contract's *Types* and *Frontend interface* blocks, exported, verbatim. That includes `SourceData.off?: boolean` (pile member switched off, never read) and any request below that the controller has accepted. `export class ApiError extends Error { status: number; code: string; constructor(status: number, code: string, detail?: string) }`.
- Produces (`api/ids.ts`): `newId(prefix: 'b' | 'c' | 'e', now?: () => number, rand?: () => number): string`; `genMessageId(): string`.
- Produces (`lib/catalog.ts`):
  - `type Family = 'media' | 'docs' | 'note' | 'web' | 'data' | 'image' | 'mixed' | 'answer'`
  - `TYPE_INFO: Record<SourceType, { family: Family; icon: string; label: string }>`, mapped from prototype `TYPES`: `audio` = prototype `podcast`, `pile` = prototype `stack`
  - `FAMC: Record<Family, [string, string]>`, `STRING_COL: Record<Family, string>` (lines 400–401)
  - `type ModelKey = 'claude' | 'gpt' | 'gemini' | 'llama' | 'deepseek' | 'mistral' | 'kimi'`
  - `MODELS: Record<ModelKey, { label: string; color: string; engineId: string }>`, the single model table:

    | key | label | color | engineId |
    |---|---|---|---|
    | claude | Claude | #E0673A | `anthropic/claude-sonnet-4-20250514` |
    | gpt | GPT | #3FAE5A | `openai/gpt-oss-120b` |
    | gemini | Gemini | #2A86C4 | `gemini/gemini-3-flash-preview` |
    | llama | Llama (Groq) | #7A52D6 | `meta-llama/llama-4-maverick-17b-128e-instruct` |
    | deepseek | DeepSeek | #3B6FD8 | `deepseek-ai/deepseek-v4-pro` |
    | mistral | Mistral | #E2A72A | `mistralai/mistral-large-3-675b-instruct-2512` |
    | kimi | Kimi | #D1467E | `moonshotai/kimi-k2-instruct` |

  - `MAIN_MODELS: ModelKey[] = ['claude', 'gpt', 'gemini']`
  - `DEFAULT_MODEL_KEY: ModelKey = 'gpt'`. Builder's call, see the contract requests: Claude needs BYOK, so a Claude default would fail the first question for most users.
  - `modelInfo(engineId: string): { key: ModelKey | null; label: string; color: string }`. Unknown id → `{ key: null, label: <last path segment>, color: '#6E6585' }`.
  - `PERSONAS: Record<'none' | 'skeptic' | 'teacher' | 'coach' | 'analyst', { label: string; text: string }>`, copied verbatim from line 403
  - `personaLabel(key: string): string | null`: `none` → null, `custom` → `'Custom'`
  - `DEFAULT_ADVANCED: AdvancedSettings = { temperature: null, maxOutputTokens: null, historyMode: 'auto', lastKMessages: 6, externalContextTopK: 5, contextBudgetTokens: null }`
  - `ADV_FIELD_MAP = { temp: 'temperature', maxOut: 'maxOutputTokens', hist: 'historyMode', k: 'lastKMessages', topK: 'externalContextTopK', budget: 'contextBudgetTokens' } as const`. This documents the prototype DEFAULT_ADV → contract mapping; the branch sheet binds controls through it.
  - `defaultChatData(name: string, model?: string): ChatData`: persona `none`, systemPrompt `''`, inheritDesk `true`, carry `'summary'`, `DEFAULT_ADVANCED`, hide `[]`
- Produces (`lib/graph.ts`). Every function is pure over `type Graph = { cards: ReadonlyMap<Id, Card>; edges: ReadonlyMap<Id, Edge> }`:
  `chatData(c: Card): ChatData`, `sourceData(c: Card): SourceData`, `isChat(c?: Card | null): boolean`, `chatsOf(g): Card[]` (ordered by `createdAt`, then id), `sourcesOf(g): Card[]` (excludes pile members), `kids(g, id): Card[]`, `ancestors(g, id): Card[]` (nearest first), `descendants(g, id): Card[]`, `deskOf(g, chatId): Card[]` (`deskId === chatId && !pileId`), `membersOf(g, pileId): Card[]`, `wiresInto(g, chatId): Edge[]`, `answersInto(g, chatId): Edge[]`, `edgesFrom(g, id): Edge[]`, `wireKey(e: Edge): string` (`s|from|to` for wire, `a|from|to` for answer), `qNum(g, id): string`, `nameOf(g, c: Card): string`, `famOf(g, c: Card): Family`, `subtree(g, id): number`, `tubeW(g, id): number`, `canPlug(g, fromId: Id, kind: 'src' | 'chat', chatId: Id): boolean`, `tokensOf(g, c: Card): number`, `hasAnswer(c: Card): boolean` (`(messageCount ?? 0) >= 2 || lastMessage?.role === 'assistant'`).
- Produces (`lib/reads.ts`): `computeReads(g: Graph, chatId: Id): Reads` and `isRead(i: ReadItem): boolean` (`!i.hidden && i.state === 'ready'`).
- Produces (`api/mock/seed.ts`): `SEED_BOARD_ID = 'b_seed'`; `seedBoard(): { board: Board; messages: Record<Id, Message[]> }`.

Rules `computeReads` implements (prototype `ctx`, lines 430–440, plus contract `ReadItem`):
- own = desk sources (`how: 'desk'`) + wire edges into the chat whose source is not on its desk (`'wire'`) + answer edges into it (`'answer'`); all `inherited: false`, `via: chatId`.
- up = if the chat has a parent and `inheritDesk !== false`: `computeReads(parent).items`, keeping `!hidden` items not already in own (by `cardId`), re-marked `inherited: true`, `hidden: hide.includes(cardId) || hide.includes(pileIdOf(cardId))`, `via` unchanged.
- A pile expands to its members whose `data.off !== true`. Each member gets its own item with the pile's `how` and `via`.
- `state`: chat → `hasAnswer ? 'ready' : 'waiting'`; source → its `status`.
- `tokens`: `tokensOf` (prototype line 424). This is a mock-only estimate; the engine's own estimate replaces it later.
- `totalTokens` = sum over `isRead` items.

Seed (prototype 1262–1280): board `b_seed`, title `Pricing study`. Card ids, positions and `deskId` are kept from the prototype. Chats: `main` (claude), `side` (gpt, teacher, parent main), `second` (gemini, skeptic, parent main), `deep` (gemini, parent second). Sources: `video` (video, soon), `pdf`, `note`, `web`, `interviews` (pile; members `interviews_1`…`interviews_4` from lines 1274, `deskId: null`, `pileId: 'interviews'`), `podcast` (audio, soon, loose), `csv` (loose; `data.table` = columns `Tool, Price, Billing`, rows from line 1006), `shot` (image, soon, desk deep). Edges: `lin_side`, `lin_second`, `lin_deep` (lineage), `e_seed_csv_deep` (wire csv→deep), `e_seed_side_deep` (answer side→deep). `createdAt` follows prototype `at` (Monday 2026-10-19, 10:12 / 10:20 / 10:31 / 11:02 UTC), and sources follow seed order. Excerpts: prototype `{loc, t, on}` → contract `{loc, text, on}`. Messages: two per chat with ids `seed_<chat>_u` / `seed_<chat>_a`, positions 0 and 1. The answers are `A_MAIN` and `A_SECOND` and the two inline answers rewritten as markdown (`### ` headings, `1. ` lists, `**bold**`), wording unchanged.

- [ ] **Step 1: Write the failing tests**

```ts
// ids.test.ts
it('makes contract-shaped ids', () => {
  expect(newId('c', () => 1700000000000, () => 0.5)).toMatch(/^c_[0-9a-z]+_[0-9a-z]{6}$/);
  expect(newId('e')).toMatch(/^e_/); expect(new Set(Array.from({ length: 500 }, () => newId('c'))).size).toBe(500);
});
// graph.test.ts — g = graphOf(seedBoard().board)
it('numbers questions like the prototype', () => {
  expect(['main', 'side', 'second', 'deep'].map(id => qNum(g, id))).toEqual(['Q1', 'Q1.1', 'Q1.2', 'Q1.2.1']);
});
it('canPlug follows the prototype rules', () => {
  expect(canPlug(g, 'side', 'chat', 'second')).toBe(true);
  expect(canPlug(g, 'main', 'chat', 'deep')).toBe(false);   // ancestor
  expect(canPlug(g, 'deep', 'chat', 'main')).toBe(false);   // descendant
  expect(canPlug(g, 'side', 'chat', 'deep')).toBe(false);   // already strung
  expect(canPlug(g, 'side', 'chat', 'side')).toBe(false);
  expect(canPlug(g, 'pdf', 'src', 'main')).toBe(false);     // on its desk
  expect(canPlug(g, 'csv', 'src', 'deep')).toBe(false);     // already wired
  expect(canPlug(g, 'podcast', 'src', 'side')).toBe(true);
});
it('tube width grows with the subtree', () => { expect(tubeW(g, 'second')).toBeGreaterThan(tubeW(g, 'deep')); expect(tubeW(g, 'deep')).toBe(4); });
it('pile family is mixed when members differ', () => { expect(famOf(g, g.cards.get('interviews')!)).toBe('mixed'); });
it('sourcesOf hides pile members', () => { expect(sourcesOf(g).map(c => c.id)).not.toContain('interviews_1'); expect(sourcesOf(g)).toHaveLength(8); });
// reads.test.ts
it('main reads its desk; the soon video is listed, not read', () => {
  const r = computeReads(g, 'main');
  expect(r.items.map(i => [i.cardId, i.how, i.inherited, i.state])).toEqual([
    ['video', 'desk', false, 'soon'], ['pdf', 'desk', false, 'ready'], ['note', 'desk', false, 'ready']]);
  expect(r.totalTokens).toBe(r.items.filter(isRead).reduce((a, i) => a + i.tokens, 0));
});
it('a branch inherits the desk above, via the chat it came from', () => {
  expect(computeReads(g, 'side').items.every(i => i.inherited && i.via === 'main')).toBe(true);
});
it('second expands the pile into members', () => {
  const ids = computeReads(g, 'second').items.filter(i => !i.inherited).map(i => i.cardId);
  expect(ids).toEqual(['web', 'interviews_1', 'interviews_2', 'interviews_3', 'interviews_4']);
});
it('deep reads desk, wire, answer, then inherited', () => {
  const own = computeReads(g, 'deep').items.filter(i => !i.inherited);
  expect(own.map(i => [i.cardId, i.how])).toEqual([['shot', 'desk'], ['csv', 'wire'], ['side', 'answer']]);
});
it('hide marks the item hidden and drops it for descendants', () => { /* deep.data.hide=['pdf'] → pdf hidden on deep; a new child of deep has no pdf item */ });
it('inheritDesk false reads nothing from above', () => { /* side.data.inheritDesk=false → items [] */ });
it('a switched-off member is not read', () => { /* interviews_2.data.off=true → absent from second */ });
it('an answer chat with no answer is waiting', () => { /* side.messageCount=0, lastMessage=null → state 'waiting', not counted */ });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run components/board/api components/board/lib`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `types.ts`, `ids.ts`, `catalog.ts`, `graph.ts`, `reads.ts`, `seed.ts`**

`graphOf(board: Board): Graph` lives in `graph.ts` (maps by id). Seed card `messageCount` = 2 and `lastMessage` = the answer clipped to 280 chars.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run components/board && npm run typecheck:board`
Expected: PASS.

- [ ] **Step 5: Commit** (secret scan first). Message: `feat(board): contract types, model table, read-set rules and the prototype seed`, with Why: `one pure read-set function serves the mock and the board's instant feedback, so they cannot disagree (spec §5.2)`.

---

### Task 3: MockEngineApi

**Files:**
- Create: `components/board/api/mock/mock-engine-api.ts`
- Test: `components/board/api/mock/mock-engine-api.test.ts`

**Interfaces:**
- Consumes: Task 2 (`EngineApi`, types, `ApiError`, `seedBoard`, `graphOf`, `computeReads`, `canPlug`, `nameOf`, `isRead`, `personaLabel`, `defaultChatData`, `newId`).
- Produces:
```ts
export interface MockOptions { seed?: boolean /* default true */; latencyMs?: number /* 0 */; ingestMs?: number /* 1800 */;
  firstTokenMs?: number /* 1100 */; wordMs?: number /* 46 */; foreignIds?: string[] /* owned by another user */ }
export class MockEngineApi implements EngineApi {
  constructor(opts?: MockOptions);
  readonly calls: { method: string; args: unknown[] }[];          // every EngineApi call, in order
  failNext(method: keyof EngineApi, err: ApiError): void;          // next call to method rejects with err
  /* every EngineApi method */
}
```

Behaviour follows the contract's *Routes* table. Mock-only rules:
- Every result is a `structuredClone`, so callers can't mutate mock state.
- Every method resolves after `latencyMs` (`setTimeout`) and appends to `calls` first.
- `uploadFile`: size > 4 MB → `ApiError(413, 'too_large')`. Extension `pdf` → pdf; `docx`, `txt`, `md` → doc; `csv` → csv. These are created `processing`, with `meta` `"<label> · <sizeOf>"`. After `ingestMs` they become `ready` with `excerpts: [{ loc: null, text: 'Read in full.', on: true }]` and `summary`; txt/md also get `text` = the first 4000 chars of `file.text()`. Names containing `broken` become `failed` with `data.error = "Couldn't read this file."`. `png`, `jpg`, `jpeg`, `webp`, `gif` → image `soon`; `mp3`, `m4a`, `wav` → audio `soon`. Anything else → `ApiError(415, 'unsupported_type')`. The mock keeps an object URL per uploaded card for `rawFileUrl`.
- `addLink`: a URL that isn't http(s), or whose host is `localhost` / `127.*` / `10.*` / `192.168.*` → `ApiError(400, 'invalid')`. youtube.com / youtu.be → video `soon`, `ytid` (`v` param, else last path segment), `title: 'YouTube video'`, `meta: 'YouTube'`. Otherwise web `processing` → `ready` after `ingestMs`, with `title = cut(host + path, 40)`, `meta = host`, and `excerpts: [{ loc: '§ 1', text: 'Page read.', on: true }]`.
- `streamChat`: after `firstTokenMs`, streams the canned answer two words per delta every `wordMs` (prototype `send`, lines 888–891). The text is ``${voice ? `(${voice}) ` : ''}`` + (`Reading <first two read names joined by ' and '>` + (` plus N more` when more than 2) + `: `, or `Nothing on this desk yet, so going on the conversation alone: `) + `try $12 a month with ten real users before you decide, and ask what they'd pay before you show a number.` `voice` = `personaLabel` for preset personas only; names = `nameOf` of `isRead` items. When `webSearch` is on, it first emits `{ type: 'web', results: [{ title: 'Pricing pages compared', url: 'https://example.com/pricing' }] }`. On done it stores `<messageId>_u` / `<messageId>_a` and updates `messageCount` / `lastMessage`, then emits `done`. `regenerateLastUser` replaces the last assistant message. An aborted signal stops emitting, stores nothing for the assistant, and rejects with `DOMException('AbortError')`.
- `deleteCard` / `restoreCard`: a soft-delete stamp per call; `getBoard` hides deleted cards and edges touching them, and shows desk sources and pile members of deleted cards with `deskId` / `pileId` `null`.
- The contract's *Clarifications* section, mirrored:
  - `MockOptions.foreignIds?: string[]` are ids owned by "another user"; creating a board, card or edge with one → 409 `duplicate`.
  - `getMessages` on a source → 400 `invalid`.
  - An edge whose end card is missing or on another board → 404.
  - Restoring a card whose parent is still deleted → 409 `not_allowed`.
  - A restore or upload that would pass 50 live cards → 409 `card_limit`.
  - Re-posting an existing source id (`createCard`, `uploadFile`, `addLink`) → the existing card, with no second ingest timer.
  - Lineage edges are listed only when both ends are live.
- `streamChat` validates `req.boardId`: the chat must be a live chat on that board, else `ApiError(404, 'not_found')`.
- `getReads` honours `SourceData.off` through `computeReads`.

- [ ] **Step 1: Write the failing tests**

```ts
const api = () => new MockEngineApi({ ingestMs: 10, firstTokenMs: 0, wordMs: 0 });
it('serves the seed board', async () => { const b = await api().getBoard('b_seed'); expect(b.cards).toHaveLength(16); expect(b.edges).toHaveLength(5); });
it('createBoard makes <id>_q1 at 0,0', async () => { const m = api(); const b = await m.createBoard({ id: 'b_x', title: 'T' });
  expect(b.cards.map(c => [c.id, c.x, c.y, (c.data as ChatData).name])).toEqual([['b_x_q1', 0, 0, 'T']]); });
it('creates are idempotent', async () => { /* createCard same id twice → same card, card count +1 */ });
it('a branch gets lin_<id>', async () => { /* createCard chat parentId main → edges contain {id:'lin_c1', kind:'lineage', from:'main', to:'c1'} */ });
it('50 live cards → 409 card_limit', async () => { /* fill to 50, next rejects ApiError status 409 code card_limit */ });
it('updateCard merges data key by key and checks deskId', async () => {
  const m = api(); const c = await m.updateCard('b_seed', 'pdf', { data: { desc: 'x' } });
  expect((c.data as SourceData).title).toBe('Pricing survey 2025');
  await expect(m.updateCard('b_seed', 'pdf', { deskId: 'csv' })).rejects.toMatchObject({ status: 400, code: 'invalid' });
});
it('edges: duplicate and not_allowed', async () => {
  const m = api();
  await expect(m.createEdge('b_seed', { id: 'e1', kind: 'wire', from: 'csv', to: 'deep' })).rejects.toMatchObject({ status: 409, code: 'duplicate' });
  await expect(m.createEdge('b_seed', { id: 'e2', kind: 'answer', from: 'main', to: 'deep' })).rejects.toMatchObject({ code: 'not_allowed' });
  await expect(m.createEdge('b_seed', { id: 'e3', kind: 'wire', from: 'pdf', to: 'main' })).rejects.toMatchObject({ code: 'not_allowed' });
  await expect(m.deleteEdge('b_seed', 'lin_side')).rejects.toMatchObject({ status: 400 });
});
it('deleting a chat takes its subtree and frees its desk; restore undoes it', async () => {
  const m = api(); expect((await m.deleteCard('b_seed', 'second')).sort()).toEqual(['deep', 'second']);
  const b = await m.getBoard('b_seed'); expect(b.cards.find(c => c.id === 'web')!.deskId).toBeNull();
  expect(b.edges.find(e => e.id === 'e_seed_side_deep')).toBeUndefined();
  expect((await m.restoreCard('b_seed', 'second')).sort()).toEqual(['deep', 'second']);
  expect((await m.getBoard('b_seed')).cards.find(c => c.id === 'web')!.deskId).toBe('second');
});
it('getReads matches computeReads and rejects a source', async () => { /* deep reads equal computeReads(graphOf(board),'deep'); getReads('pdf') → 400 */ });
it('savePositions moves known ids, ignores unknown', async () => { /* [{id:'pdf',x:1,y:2},{id:'nope',x:0,y:0}] → pdf at 1,2 */ });
it('uploads: cap, types, ingest', async () => {
  const m = api(); const big = new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'a.pdf');
  await expect(m.uploadFile('b_seed', { id: 'c1', file: big, x: 0, y: 0 })).rejects.toMatchObject({ status: 413 });
  await expect(m.uploadFile('b_seed', { id: 'c2', file: new File(['x'], 'a.mov'), x: 0, y: 0 })).rejects.toMatchObject({ status: 415 });
  const c = await m.uploadFile('b_seed', { id: 'c3', file: new File(['hi'], 'n.md'), x: 0, y: 0 });
  expect(c.status).toBe('processing'); await sleep(30);
  const r = (await m.getBoard('b_seed')).cards.find(x => x.id === 'c3')!; expect(r.status).toBe('ready'); expect((r.data as SourceData).text).toBe('hi');
});
it('links: youtube is soon with ytid; private hosts are invalid', async () => { /* youtu.be/abc → video, soon, ytid 'abc'; http://localhost/x → 400 */ });
it('streams the canned answer and stores <mid>_u/_a', async () => {
  const m = api(); const ev: StreamEvent[] = [];
  await m.streamChat({ boardId: 'b_seed', chatId: 'side', messageId: 'm1', message: 'hi', model: 'x', systemPrompt: '', temperature: null,
    maxOutputTokens: null, lastKMessages: null, externalContextTopK: 5, webSearch: false }, e => ev.push(e));
  const text = ev.filter(e => e.type === 'delta').map(e => (e as any).text).join('');
  const g = graphOf(await m.getBoard('b_seed')), names = computeReads(g, 'side').items.filter(isRead).map(i => nameOf(g, g.cards.get(i.cardId)!));
  expect(text).toBe(`(Teacher) Reading ${names[0]} and ${names[1]}: try $12 a month with ten real users before you decide, and ask what they'd pay before you show a number.`);
  expect(ev.at(-1)).toEqual({ type: 'done' });
  expect((await m.getMessages('b_seed', 'side')).slice(-2).map(x => x.id)).toEqual(['m1_u', 'm1_a']);
});
it('abort stops the stream and stores no answer', async () => { /* AbortController aborted after first delta → rejects AbortError; last message is m2_u */ });
it('failNext rejects the next call only', async () => { /* failNext('createEdge', new ApiError(500,'boom')) → first rejects, second ok */ });
// contract Clarifications
it('a foreign id is a duplicate', async () => { /* new MockEngineApi({foreignIds:['c_x']}).createCard(...id 'c_x') → 409 duplicate */ });
it('messages of a source are invalid; an edge to a missing card is 404', async () => { /* getMessages('pdf') → 400; createEdge to 'nope' → 404 */ });
it('restore under a deleted parent is not allowed', async () => { /* delete 'deep', delete 'second', restore 'deep' → 409 not_allowed */ });
it('restore past 50 live cards hits card_limit', async () => { /* delete 'second' (2 cards), fill to 50, restore 'second' → 409 card_limit */ });
it('re-posting a source id returns it without a second ingest', async () => { /* uploadFile id c3 twice → same card; after ingestMs the card turned ready once (calls/timers count) */ });
it('lineage edges only between live cards', async () => { /* delete 'deep' → getBoard edges has no lin_deep */ });
it('a stream on another board is refused', async () => { /* streamChat boardId 'b_other' chatId 'side' → ApiError 404 */ });
it('switched-off members are never read', async () => { /* updateCard interviews_2 {data:{off:true}} → getReads('second') has no interviews_2 */ });
```
(The exact expected stream string comes from `nameOf`: `pdf` → its title; `note` → `cut(text, 34)`. The test computes `names` with `nameOf` rather than hard-coding the note's cut text.)

- [ ] **Step 2: Run to verify they fail** — `npx vitest run components/board/api/mock`. Expected: FAIL.
- [ ] **Step 3: Implement `MockEngineApi`**
- [ ] **Step 4: Run to verify they pass** — same command plus `npm run typecheck:board`. Expected: PASS.
- [ ] **Step 5: Commit** — `feat(board): in-memory MockEngineApi seeded with the prototype board`, with Why: `the board is built against the contract before the engine exists (spec §9 step 2)`.

---

### Task 4: Springs, camera, frame loop

Ports prototype 384–396 (Spring, project, clamp), 750–761 (s2w, camSnap, zoomAt, fit, flyTo), 768 (velocity), 1199–1202 (frame stepping).

**Files:**
- Create: `components/board/engine/spring.ts`, `components/board/engine/camera.ts`, `components/board/engine/loop.ts`
- Test: `components/board/engine/spring.test.ts`, `components/board/engine/camera.test.ts`, `components/board/engine/loop.test.ts`

**Interfaces:**
- Produces:
```ts
// spring.ts
export class Spring { x: number; t: number; v: number; k: number; c: number; readonly rm: boolean;
  constructor(v: number, r?: number /* .4 */, d?: number /* 1 */, rm?: boolean);
  cfg(r: number, d: number): this; to(t: number, vel?: number): this; snap(v: number): this; kick(v: number): this;
  step(dt: number): void; settled(eps?: number /* .5 */): boolean }
export class SpringSystem { readonly rm: boolean; constructor(rm: boolean);
  make(v: number, r?: number, d?: number): Spring; remove(s: Spring): void; step(dt: number): void; readonly size: number }
export const project: (v: number, d?: number) => number;   // (v/1000)*d/(1-d), d default .99
export const clamp: (v: number, a: number, b: number) => number;
export function velocity(hist: { x: number; y: number; t: number }[], now: number): [number, number];
// camera.ts
export type Box = [number, number, number, number];
export class Camera { x: Spring; y: Spring; z: Spring; constructor(sys: SpringSystem);
  s2w(cx: number, cy: number): [number, number]; snap(x: number, y: number, z?: number): void;
  zoomAt(px: number, py: number, nz: number, anim: boolean): void;   // nz clamped .2..2
  fit(bounds: Box | null, vw: number, vh: number, anim: boolean): void;
  flyTo(card: { x: number; y: number; w: number }, vw: number, vh: number): void;
  center(vw: number, vh: number): [number, number] }               // world point at the viewport centre, using targets
export function fitTransform(b: Box, vw: number, vh: number): { x: number; y: number; z: number };   // l30 r30 pt90 pb96, z ≤ 1.1
// loop.ts
export class FrameLoop { constructor(sys: SpringSystem, onFrame: (dt: number, now: number) => void,
  raf?: (cb: FrameRequestCallback) => number, caf?: (h: number) => void);
  start(): void; stop(): void; tick(now: number): void }   // dt = min(.05, Δ/1000); sys.step(dt) in ceil(dt*240) substeps, then onFrame
```

- [ ] **Step 1: Write the failing tests**

```ts
it('settles on target', () => { const s = new Spring(0, .4, 1).to(100); for (let i = 0; i < 480; i++) s.step(1 / 240); expect(s.x).toBeCloseTo(100, 1); expect(s.settled()).toBe(true); });
it('underdamped springs overshoot (wobble)', () => { const s = new Spring(0, .5, .3).to(100); let max = 0; for (let i = 0; i < 480; i++) { s.step(1 / 240); max = Math.max(max, s.x); } expect(max).toBeGreaterThan(105); });
it('cfg sets k and c from period and damping', () => { const s = new Spring(0).cfg(.5, .8); expect(s.k).toBeCloseTo((2 * Math.PI / .5) ** 2); expect(s.c).toBeCloseTo(4 * Math.PI * .8 / .5); });
it('snaps instead of animating when reduced motion is on', () => { const s = new Spring(0, .4, 1, true).to(50); expect(s.x).toBe(50); s.kick(10); expect(s.v).toBe(0); });
it('project throws a flick forward', () => { expect(project(1000)).toBeCloseTo(99); });
it('velocity ignores stale history', () => { expect(velocity([{ x: 0, y: 0, t: 0 }], 200)).toEqual([0, 0]); });
// camera
it('s2w inverts the camera', () => { const c = new Camera(new SpringSystem(false)); c.snap(100, 50, 2); expect(c.s2w(300, 250)).toEqual([100, 100]); });
it('zoomAt keeps the point under the cursor', () => { /* snap(0,0,1); zoomAt(400,300,2,false); s2w(400,300) → [400,300] */ });
it('zoom is clamped to .2..2', () => { /* zoomAt(...,5,false) → z 2; (...,.01) → .2 */ });
it('fitTransform fits and caps at 1.1', () => { const t = fitTransform([0, 0, 100, 100], 1440, 900); expect(t.z).toBe(1.1); });
// loop
it('steps springs in 240 Hz substeps and clamps dt', () => { /* fake raf; tick(0), tick(1000) → onFrame dt === .05 */ });
```

- [ ] **Step 2: Run to verify they fail** — `npx vitest run components/board/engine`. Expected: FAIL.
- [ ] **Step 3: Implement the three modules** (constants from the cited lines)
- [ ] **Step 4: Run to verify they pass** — Expected: PASS, and `npm run typecheck:board` exits 0.
- [ ] **Step 5: Commit** — `feat(board): springs, camera and frame loop ported from the prototype`.

---

### Task 5: Layout geometry — makeRoom, separateDesks, desk boxes, free spots

Ports prototype 611–624 (deskBounds, freeSpot, spotOnDesk), 666–722 (makeRoom, deskBoxT, moveDesk, separateDesks), 769 (deskAt), 1119 (placeFor).

**Files:**
- Create: `components/board/engine/geometry.ts`
- Test: `components/board/engine/geometry.test.ts`

**Interfaces:**
- Consumes: `Spring`, `clamp`, `Box` (Task 4).
- Produces:
```ts
export interface LayoutItem { id: string; isChat: boolean; isPile: boolean; deskId: string | null; w: number; h: number;
  px: Spring; py: Spring; rot: Spring; dragging?: boolean }
export interface Layout { items: ReadonlyMap<string, LayoutItem>; chats: string[]; rand?: () => number }
export function boxT(m: LayoutItem): Box;                                  // targets; +14 below a pile
export function deskMembers(l: Layout, chatId: string): LayoutItem[];
export function deskBoxT(l: Layout, chatId: string): Box;                   // P = 28, tab room 18
export function deskBounds(l: Layout, chatId: string, except?: LayoutItem | null): Box | null;   // current x; empty desk min 300 wide, +44 tall
export function deskAt(l: Layout, x: number, y: number, except?: LayoutItem | null): string | null;
export function makeRoom(l: Layout, n: LayoutItem): string[];               // ids it moved (n included when it moved)
export function separateDesks(l: Layout, fromChatId: string): string[];      // ids it moved
export function moveDesk(l: Layout, chatId: string, dx: number, dy: number): void;
export function freeSpot(l: Layout, x: number, y: number, w: number, h: number): [number, number];
export function spotOnDesk(l: Layout, chatId: string): [number, number];
export function placeFor(l: Layout, deskId: string | null, i: number, at: [number, number] | null, center: [number, number]): [number, number];
```
`makeRoom` calls `separateDesks(n.deskId)` at its end, as the prototype does (line 690). Spring configs are the prototype's: `(.5, .72)` for makeRoom moves, `(.55, .8)` for desk moves.

- [ ] **Step 1: Write the failing tests**

Fixture: `item(id, x, y, { w, h, isChat, deskId, isPile })` builds springs at rest (rm = true, so `to()` lands at once and assertions read `px.t`).
```ts
const hits = (a: Box, b: Box, g = 0) => a[0] < b[2] + g && a[2] + g > b[0] && a[1] < b[3] + g && a[3] + g > b[1];
it('a source dropped on a chat slides to the chat\'s left', () => {
  const c = item('c', 400, 0, { w: 320, h: 300, isChat: true }), s = item('s', 420, 50, { w: 212, h: 90, deskId: 'c' });
  makeRoom(layout([c, s]), s); expect(s.px.t).toBe(400 - 212 - 28); expect(c.px.t).toBe(400);
});
it('from the right side it goes to the chat\'s right', () => { /* s centre right of chat centre + w*.25 → s.px.t === 400+320+28 */ });
it('nudges cascade until nothing overlaps (gap 18)', () => {
  /* three sources stacked at the same spot, makeRoom(first) → every pair of boxT clear by hits(...,18) === false */
});
it('chats are never shoved by sources', () => { /* chat overlapped by the pushed chain keeps px.t/py.t */ });
it('desks push each other apart as a whole', () => {
  /* chat A at 0,0 with one desk source; chat B at 100,50 with one source; separateDesks(l,'A') →
     !hits(deskBoxT(l,'A'), deskBoxT(l,'B'), 36); B's source moved by the same dx,dy as B */
});
it('a loose card under a growing desk slides out', () => { /* loose source inside A's box → moved clear (gap 20) */ });
it('a desk being dragged is not pushed', () => { /* B.dragging = true → B unmoved */ });
it('freeSpot steps down 60px past occupied boxes', () => { /* occupied at 0,0 → returns [0, 60*k] clear of boxes; 40 tries exhausted → [x+420, y] */ });
it('spotOnDesk stacks 96px rows left of the chat', () => { /* chat at 500,0 → [260,0]; with a member at 260,0 → [260,96] */ });
it('deskAt finds the desk under a point', () => { /* point inside deskBounds of A → 'A'; outside → null */ });
```

- [ ] **Step 2: Run to verify they fail** — `npx vitest run components/board/engine/geometry.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `geometry.ts`**
- [ ] **Step 4: Run to verify they pass.** Expected: PASS.
- [ ] **Step 5: Commit** — `feat(board): makeRoom, separateDesks and free-spot geometry`, with Why: `DECISIONS 2026-10-19 row 52, nothing sits on top of anything`.

---

### Task 6: Pebble CSS, fonts, icons, markdown, format helpers

Ports prototype CSS lines 10–357 and helpers 378–383.

**Files:**
- Create: `components/board/pebble.css`, `components/board/fonts.ts`, `components/board/engine/icons.ts`, `components/board/lib/markdown.ts`, `components/board/lib/format.ts`
- Modify: `package.json` (add `lucide@0.460.0`)
- Test: `components/board/lib/markdown.test.ts`, `components/board/lib/format.test.ts`, `components/board/engine/icons.test.ts`, `components/board/pebble-css.test.ts`

**Interfaces:**
- Produces:
  - `fonts.ts`: `export const bricolage = Bricolage_Grotesque({ subsets: ['latin'], axes: ['opsz'], variable: '--pb-font', display: 'swap' })`. Only `Board.tsx` imports it.
  - `icons.ts`: `icon(name: string, color?: string, size?: number): string`. It returns `<span class="i" style="--c:…;--s:…px"><svg …/></span>` built with `createElement` from `lucide` (cached per name). Names are the prototype's lucide names (play, audio-lines, file-text, file-pen-line, sticky-note, globe, sheet, image, layers, message-circle, git-fork, plus, minus, maximize, link, maximize-2, chevrons-down-up, chevrons-up-down, ungroup, x, triangle-alert, unlink, git-branch, arrow-up, sliders-horizontal, chevron-down, arrow-left, copy, upload, more-horizontal, globe-lock, trash-2, rotate-ccw). An unknown name throws.
  - `markdown.ts`: `renderMarkdown(md: string): string`. It escapes first, then supports `#`–`######` (all rendered as `<h3>`), paragraphs, `1.` lists → `<ol>`, `-` / `*` lists → `<ul>`, `**b**`, `*i*`, `` `code` ``, and `[t](https://…)` → `<a target="_blank" rel="noopener noreferrer">`. It removes `<think>…</think>` and an unterminated `<think>` tail.
  - `format.ts`: `cut(s, n)`, `strip(html)`, `sizeOf(bytes)` (lines 382–383, 1107), `formatWhen(iso, now)` (`'Now'` for the current chat is the caller's; otherwise `Mon 10:12` style weekday + `HH:MM` local).
- CSS rules: copy every rule, then translate selectors:

  | prototype | port |
  |---|---|
  | `:root` | `.pb-root` (plus `position: fixed; inset: 0; overflow: hidden; background: var(--pb-canvas); font-family: var(--pb-font), system-ui, sans-serif`) |
  | `html, body`, `*`, `button…` | `.pb-root`, `.pb-root *`, `.pb-root button…` |
  | `#vp #world #tubes #knobs` | `.pb-vp .pb-world .pb-tubes .pb-knobs` |
  | `body.stringing` | `.pb-root.stringing` |
  | `#brand #add #linkpop #trail #zoom #drop #scrim #reader` | `[data-pb="brand"]` … `[data-pb="focus"]` |
  | `.i` mask icon | `.i { width: var(--s,16px); height: var(--s,16px); color: var(--c, currentColor); display: inline-block; flex: none } .i svg { width: 100%; height: 100% }` |

  Every other selector gets a `.pb-root ` prefix.
- New V3 rules in `pebble.css`:
  - `.soon-pill` (9.5px, weight 600, `#fff` background, `color: var(--fd)`, padding 2px 7px, radius 999px, `align-self: flex-start`)
  - `.dots i.soon { background: #fff !important; box-shadow: inset 0 0 0 2px var(--dc) }`, where the dot's colour is set as `--dc`
  - `.card.demoted` (the S blob form plus `.muted` look)
  - `.pb-toast` (fixed, bottom 88px, centred, `--pb-ink` background, white text, 999px radius, an `Undo` button underlined)
  - `.pb-confirm` (reuses `.wrap` + `.sheetbox.dlg`, width 440)
  - `.err` (12px, `var(--failed)`)
  - `.soonbox` (viewer: `var(--pb-desk)` background, 18px radius, 16px padding, 15px text)
  - `.webrow` (focus view search results, `.quote` look)
- Reduced motion, replacing line 357:
  ```
  @media (prefers-reduced-motion: reduce) {
    .pb-root .bub.flow, .pb-root .ans.live p:last-child::after, .pb-root .art.live .body p:last-child::after,
    .pb-root .thinking i, .pb-root .src.processing .tile, .pb-root .prog i, .pb-root .compose, .pb-root .caret { animation: none }
    .pb-root .menu, .pb-root .wk, .pb-root .sheetbox, .pb-root [data-pb="linkpop"], .pb-root .tools { transition-property: opacity; transform: none }
  }
  ```

- [ ] **Step 1: Write the failing tests**

```ts
// markdown.test.ts
it('renders the seed answer shape', () => {
  expect(renderMarkdown('### So\n1. **Free** with your own key.\n2. Two')).toBe('<h3>So</h3><ol><li><b>Free</b> with your own key.</li><li>Two</li></ol>');
});
it('escapes html', () => { expect(renderMarkdown('<img src=x onerror=alert(1)>')).toBe('<p>&lt;img src=x onerror=alert(1)&gt;</p>'); });
it('drops think blocks, even unterminated', () => { expect(renderMarkdown('<think>a</think>Hi')).toBe('<p>Hi</p>'); expect(renderMarkdown('Hi<think>half')).toBe('<p>Hi</p>'); });
it('only http(s) links', () => { expect(renderMarkdown('[x](javascript:alert(1))')).not.toContain('href'); });
// format.test.ts
it('cut adds an ellipsis', () => { expect(cut('abcdef', 4)).toBe('abc…'); });
it('sizeOf', () => { expect(sizeOf(2_500_000)).toBe('2.5 MB'); expect(sizeOf(300)).toBe('1 KB'); });
// icons.test.ts  (// @vitest-environment jsdom)
it('returns an svg in a sized span', () => { const h = icon('play', '#fff', 18); expect(h).toContain('<svg'); expect(h).toContain('--s:18px'); });
it('throws on unknown names', () => { expect(() => icon('nope')).toThrow(); });
// pebble-css.test.ts
const css = readFileSync('components/board/pebble.css', 'utf8');
it('keeps the prototype tokens', () => { expect(css).toContain('--pb-canvas: #EDE8F5'); expect(css).toContain('--pb-ink: #2B2340'); });
it('scopes every rule under .pb-root', () => { /* every selector list outside @keyframes starts with .pb-root */ });
it('has no blanket reduced-motion override', () => { expect(css).not.toMatch(/prefers-reduced-motion[^{]*\{\s*\*/); });
```

- [ ] **Step 2: Run to verify they fail** — `npx vitest run components/board/lib components/board/engine/icons.test.ts components/board/pebble-css.test.ts`. Expected: FAIL.
- [ ] **Step 3: `npm i lucide@0.460.0`, then implement the five files**
- [ ] **Step 4: Run to verify they pass.** Expected: PASS.
- [ ] **Step 5: Commit** — `feat(board): Pebble stylesheet, Bricolage font, icons and safe markdown`.

---

### Task 7: Store — data, per-entity merge, pinning, entity actions, polling

**Files:**
- Create: `components/board/store.ts`, `components/board/lib/merge.ts`
- Test: `components/board/lib/merge.test.ts`, `components/board/store.data.test.ts`

**Interfaces:**
- Consumes: Tasks 2–3.
- Produces (`lib/merge.ts`):
```ts
export type CardOverride = { fields: Partial<Omit<Card, 'data'>>; data: Record<string, unknown> };   // local values of in-flight patches
export function mergeCard(server: Card, o?: CardOverride): Card;
export function reconcile<T extends { id: string }>(local: ReadonlyMap<string, T>, server: T[], opts: {
  pinned: ReadonlySet<string>; hidden: ReadonlySet<string>; merge: (s: T, id: string) => T; same: (a: T, b: T) => boolean
}): { next: Map<string, T>; changed: { id: string; fields: string[] }[]; removed: string[] };
```
- Produces (`store.ts`, data half):
```ts
export type StoreChange =
  | { kind: 'card'; id: Id; fields: string[] } | { kind: 'card-removed'; id: Id }
  | { kind: 'edge'; id: Id } | { kind: 'edge-removed'; id: Id }
  | { kind: 'messages'; chatId: Id } | { kind: 'stream'; chatId: Id } | { kind: 'reads'; chatId: Id }
  | { kind: 'ui' } | { kind: 'board' };
export interface BoardSnapshot { version: number; status: 'loading' | 'ready' | 'error'; error: string | null;
  board: { id: Id; title: string; viewport: Board['viewport'] } | null;
  cards: ReadonlyMap<Id, Card>; edges: ReadonlyMap<Id, Edge>; messages: ReadonlyMap<Id, Message[]>;
  streaming: ReadonlyMap<Id, { messageId: string; text: string; web: { title?: string; url?: string }[] | null; error: string | null }>;
  ui: UiState }                                   // UiState defined in Task 8
export class BoardStore {
  constructor(api: EngineApi, boardId: Id, opts?: { pollMs?: number /* 2000 */; readsDebounceMs?: number /* 150 */; toastMs?: number /* 10000 */ });
  getSnapshot(): BoardSnapshot; subscribe(fn: () => void): () => void; onChange(fn: (c: StoreChange[]) => void): () => void;
  graph(): Graph;
  load(): Promise<void>;                          // getBoard, then getMessages + getReads per chat
  refresh(): Promise<void>;                       // getBoard → reconcile
  createNote(i: { x: number; y: number; deskId: Id | null; text?: string; meta?: string }): Id;
  createSourceFromFile(file: File, at: [number, number], deskId: Id | null, intro: 'single' | 'multi', desc?: string): Id;
  createSourceFromLink(url: string, at: [number, number], deskId: Id | null): Id | null;   // null if not a URL
  retrySource(id: Id): void;                     // re-upload the kept File / re-add the URL, then delete the failed card
  replaceWithNote(id: Id): Id;                   // note at the same spot and desk, failed card deleted
  patchCard(id: Id, patch: CardPatch): void;     // optimistic, rollback to the server copy on error
  patchDataDebounced(id: Id, data: Partial<SourceData> | Partial<ChatData>, ms?: number /* 500 */): void;
  setDesk(id: Id, deskId: Id | null): void;      // also removes a wire from id to the new desk's chat
  setExcerpt(id: Id, index: number, on: boolean): void;
  setMemberOff(memberId: Id, off: boolean): void;
  setHidden(chatId: Id, cardId: Id, hidden: boolean): void;
  connect(kind: 'wire' | 'answer', from: Id, to: Id): Id | null;   // null when canPlug says no (no API call)
  disconnect(edgeId: Id): void;
  makePile(srcId: Id, targetId: Id, at: [number, number]): Id;
  unstack(pileId: Id, spots: [number, number][]): Id[];
  savePositions(p: { id: Id; x: number; y: number }[]): void;      // local x,y + api; no card change emitted
  saveViewport(v: { x: number; y: number; zoom: number }): void;
  renameBoard(title: string): void;
  readsOf(chatId: Id): Reads;                    // server copy unless stale; then computeReads(graph())
  fileUrl(cardId: Id): string | null;            // api.rawFileUrl (contract request 1)
  intro(id: Id): 'single' | 'multi' | null; clearIntro(id: Id): void;
  dispose(): void;
}
```
Rules:
- Every action emits synchronously (`onChange` listeners run before the action returns), so the engine has the new view node when `createNote` returns.
- Optimistic creates add the card with `pinned`; a snapshot that contains it unpins it.
- `patchCard` records a `CardOverride` until the call settles. On `ApiError` the card goes back to the last server copy, a toast is shown (Task 8 `toast()`), and other overrides stay.
- `reconcile` emits `card` with the changed field names; `x`/`y` appear only when the server copy moved.
- Reads go stale for the affected chats and are refetched in one debounced batch (`readsDebounceMs`). Affected chats are:
  - desk change: the old and new desk chats and their descendants
  - edge: the target chat and its descendants
  - hide / inheritDesk: the chat and its descendants
  - a source's data or status: every chat whose current read set lists it
- Polling: when any live card is `processing`, `refresh()` runs every `pollMs`; it stops when none is.
- Error toasts (exact copy):

  | condition | toast |
  |---|---|
  | `card_limit` | `This board is full (50 cards). Remove something to add more.` |
  | 413 | `That file is over 4 MB.` |
  | 415 | `Can't read that kind of file yet.` |
  | 400 on a link | `That link can't be read.` |
  | `not_allowed` / `duplicate` on an edge | `Those two can't be strung together.` |
  | anything else | `Couldn't save that. Try again.` |

- `makePile`: `createCard` pile (title `<Label> pile` when types match, else `Mixed pile`; deskId = target's), then `updateCard` target and src `{ pileId, deskId: null }`, and moves their wires to the pile (`createEdge` pile→chat if missing, `deleteEdge` old). `unstack`: each member `{ pileId: null, deskId: pile.deskId }` + positions from `spots`, pile wires copied to every member, then `deleteCard(pile)`.

- [ ] **Step 1: Write the failing tests**

```ts
// merge.test.ts
it('override wins over the server for pending keys only', () => { /* server desc 'a', title 't'; override data {desc:'b'} → desc 'b', title 't' */ });
it('pinned local cards survive a snapshot without them', () => { /* reconcile(local {c1}, [], pinned {c1}) → next has c1, removed [] */ });
it('unpinned cards absent from the server are removed', () => { /* removed ['c1'] */ });
it('unchanged entities keep identity and emit nothing', () => { /* same() true → changed [] and next.get(id) === local.get(id) */ });
it('reports x and y only when the server moved the card', () => { /* fields contain 'x' only if server.x !== local.x */ });
// store.data.test.ts — m = new MockEngineApi({ ingestMs: 10, firstTokenMs: 0, wordMs: 0 }), s = new BoardStore(m, 'b_seed'), await s.load()
it('load fills cards, edges, messages and reads', () => { expect(s.getSnapshot().cards.size).toBe(16); expect(s.getSnapshot().messages.get('main')).toHaveLength(2); expect(m.calls.filter(c => c.method === 'getReads')).toHaveLength(4); });
it('createNote shows the card at once and pins it', async () => {
  const seen: StoreChange[] = []; s.onChange(c => seen.push(...c));
  const id = s.createNote({ x: 0, y: 0, deskId: 'main' }); expect(seen).toContainEqual({ kind: 'card', id, fields: expect.any(Array) });
  expect(s.getSnapshot().cards.get(id)!.status).toBe('ready');
});
it('stale snapshot keeps pending patch and pinned create', async () => {
  const stale = await m.getBoard('b_seed');                // before the changes
  const id = s.createNote({ x: 0, y: 0, deskId: null }); s.patchCard('pdf', { data: { desc: 'new' } });
  (s as any).applyBoard(stale);                             // test seam: reconcile a given snapshot
  expect(s.getSnapshot().cards.has(id)).toBe(true); expect((s.getSnapshot().cards.get('pdf')!.data as SourceData).desc).toBe('new');
});
it('a failed patch restores only that card\'s server copy', async () => {
  m.failNext('updateCard', new ApiError(400, 'invalid'));
  s.patchCard('pdf', { data: { desc: 'x' } }); s.patchCard('note', { data: { text: 'kept' } }); await flush();
  expect((s.getSnapshot().cards.get('pdf')!.data as SourceData).desc).toBe('Our main benchmark. Trust it over blog posts.');
  expect((s.getSnapshot().cards.get('note')!.data as SourceData).text).toBe('kept');
  expect(s.getSnapshot().ui.toast!.text).toBe("Couldn't save that. Try again.");
});
it('card_limit removes the optimistic card with the full-board toast', async () => { /* fill mock to 50, createNote → after flush card gone, toast text 'This board is full (50 cards). Remove something to add more.' */ });
it('connect refuses what canPlug refuses without calling the API', () => { expect(s.connect('answer', 'main', 'deep')).toBeNull(); expect(m.calls.some(c => c.method === 'createEdge')).toBe(false); });
it('setDesk drops the wire into the new desk\'s chat', async () => { /* setDesk('csv','deep') → e_seed_csv_deep removed, deleteEdge called */ });
it('readsOf uses the local rules while the server copy is stale', () => { /* setDesk('podcast','side') → readsOf('side') includes podcast immediately (state 'soon') */ });
it('makePile and unstack round-trip', async () => { /* makePile('web','pdf') → pile on main desk, members web+pdf with pileId; unstack → both back with deskId 'main', pile deleted */ });
it('polls every 2 s while a card is processing, then stops', async () => {
  vi.useFakeTimers(); s.createSourceFromFile(new File(['%PDF'], 'a.pdf'), [0, 0], null, 'single');
  await vi.advanceTimersByTimeAsync(4100); const n = m.calls.filter(c => c.method === 'getBoard').length; expect(n).toBeGreaterThanOrEqual(3);
  await vi.advanceTimersByTimeAsync(6000); expect(m.calls.filter(c => c.method === 'getBoard').length).toBe(n);
});
```
`applyBoard(board: Board): void` is a public method (the poll and `refresh` use it), not a private seam.

- [ ] **Step 2: Run to verify they fail** — `npx vitest run components/board/lib/merge.test.ts components/board/store.data.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `merge.ts` and the data half of `store.ts`**
- [ ] **Step 4: Run to verify they pass.** Expected: PASS.
- [ ] **Step 5: Commit** — `feat(board): store with per-entity merge, pinned creates and rollback`, with Why: `whole-board setState from a snapshot lost a fresh fork in V2 (vault: Lost updates on shared JSON blobs, client-state variant)`.

---

### Task 8: Store — UI state, branch draft, send/stream, delete/undo, toasts

Ports the state behind prototype 855–871 (selection), 874–892 (asking), 897–976 (dialog state and confirm), 1015–1037 / 1044–1046 (viewer/reader open state), 569–573 (remove).

**Files:**
- Modify: `components/board/store.ts`
- Test: `components/board/store.ui.test.ts`

**Interfaces:**
- Consumes: Task 7.
- Produces:
```ts
export interface BranchDraft { name: string; first: string; model: string /* engine id */; persona: string; personaText: string;
  inheritDesk: boolean; carry: Carry; advanced: AdvancedSettings; advOpen: boolean }
export interface DialogState { mode: 'branch' | 'root' | 'edit'; parentId: Id | null; chatId: Id | null;
  at: [number, number] | null; anchor: DOMRect | null; forkedFromMessageId: Id | null; draft: BranchDraft }
export interface UiState { selected: Id | null; dialog: DialogState | null;
  viewer: { cardId: Id; memberId: Id | null; anchor: DOMRect | null } | null; focus: Id | null;
  menu: { x: number; y: number; at: [number, number] | null; fromAdd: boolean } | null;
  linkPop: { x: number; y: number; at: [number, number] | null } | null;
  confirm: { cardId: Id; text: string } | null;
  toast: { id: number; text: string; undoCardId: Id | null } | null;
  compare: Id | null; dropping: boolean; webSearch: Readonly<Record<Id, boolean>> }
// BoardStore additions
select(id: Id | null): void;
openDialog(o: { mode: DialogState['mode']; parentId?: Id | null; chatId?: Id | null; at?: [number, number] | null;
  anchor?: DOMRect | null; first?: string; forkedFromMessageId?: Id | null }): void;
setDraft(patch: Partial<BranchDraft>): void; closeDialog(): void;
confirmDialog(spot: [number, number] | null): Id | null;   // edit → patchCard; branch/root → createChat at spot; returns new id
createChat(i: { parentId: Id | null; x: number; y: number; data: ChatData; forkedFromMessageId: Id | null }): Id;
openViewer(cardId: Id, memberId?: Id | null, anchor?: DOMRect | null): void; closeViewer(): void;
openFocus(id: Id): void; closeFocus(): void; openCompare(id: Id): void; closeCompare(): void;
promote(winnerId: Id): void; setDemoted(id: Id, demoted: boolean): void;
openMenu(m: UiState['menu']): void; closeMenu(): void; openLinkPop(p: UiState['linkPop']): void; closeLinkPop(): void;
setDropping(on: boolean): void; setWebSearch(chatId: Id, on: boolean): void;
send(chatId: Id, text: string): Promise<void>; stop(chatId: Id): void;
requestDelete(id: Id): void;     // chat → ui.confirm with the copy; source/pile → delete now + Undo toast
confirmDelete(): Promise<void>; cancelConfirm(): void; undo(): Promise<void>;
toast(text: string, undoCardId?: Id | null): void; dismissToast(): void;
```
Rules:
- Draft defaults follow prototype `openDialog` (line 898):
  - name `A new question` (root), `New question, same desk` (branch), the chat's name (edit)
  - model: the parent's, else `MODELS[DEFAULT_MODEL_KEY].engineId`
  - persona from the chat (edit) else `none`; `inheritDesk` true; carry `'summary'`; `DEFAULT_ADVANCED`
- On confirm, `systemPrompt = personaText.trim()`. `persona` is the selected preset key if the text equals that preset's text; otherwise `'custom'` if the text is non-empty, else `'none'`. `name` is the trimmed name or `Untitled`.
- `forkedFromMessageId` is the draft value, else the parent's last message id, else null.
- `send`:
  - Builds the user message `<mid>_u` and a streaming entry. `ChatRequest` comes from card data: `lastKMessages` = `historyMode === 'lastK' ? lastKMessages : null`; `webSearch` from `ui.webSearch`; `parentNodeId` / `forkedFromMessageId` only while the chat has no messages.
  - Deltas append to `streaming.text` (`stream` change).
  - `done` → `getMessages` replaces this chat's list (`messages` change), and `messageCount` / `lastMessage` are patched locally.
  - `error` → `streaming.error` is set and kept until the next send.
  - The chat composer is disabled while `streaming.has(chatId)`.
- Delete:
  - The confirm copy is in Global Constraints; branches = `descendants(id).length`, Q label = `qNum`.
  - `confirmDelete` hides the set locally, aborts streams of deleted chats, calls `deleteCard`, and shows the toast `Deleted Q1.2 and 1 branch` / `Deleted Q1.2` / `Removed <name>` with Undo for `toastMs`.
  - `undo` calls `restoreCard` then `refresh()`. A new toast replaces the old one, and the old one can no longer be undone.
- `promote(winner)`: winner `demoted: false`, its siblings (same parent) `demoted: true`; toast `Kept Q1.2 · 1 sibling folded`.

- [ ] **Step 1: Write the failing tests**

```ts
it('branch draft starts from the parent', () => { s.openDialog({ mode: 'branch', parentId: 'second' });
  expect(s.getSnapshot().ui.dialog!.draft).toMatchObject({ name: 'New question, same desk', model: MODELS.gemini.engineId, inheritDesk: true, carry: 'summary' }); });
it('confirmDialog creates a branch with ChatData from the draft (persona custom when text edited)', async () => {
  s.openDialog({ mode: 'branch', parentId: 'main' }); s.setDraft({ persona: 'skeptic', personaText: 'Be blunt.' });
  const id = s.confirmDialog([10, 20])!; const c = s.getSnapshot().cards.get(id)!;
  expect([c.parentId, c.x, c.y]).toEqual(['main', 10, 20]); expect(c.data).toMatchObject({ persona: 'custom', systemPrompt: 'Be blunt.' });
  expect(s.getSnapshot().ui.dialog).toBeNull();
});
it('edit mode patches the chat', () => { /* openDialog edit chatId side; setDraft({carry:'whole'}); confirmDialog(null) → side data.carry 'whole', returns 'side' */ });
it('send streams into the chat and ends with server messages <mid>_u and <mid>_a', async () => {
  await s.send('side', 'why?'); const msgs = s.getSnapshot().messages.get('side')!;
  expect(msgs.at(-2)!.id).toMatch(/_u$/); expect(msgs.at(-1)!.id).toMatch(/_a$/); expect(s.getSnapshot().streaming.has('side')).toBe(false);
});
it('send on a fresh branch passes parentNodeId and forkedFromMessageId', async () => {
  const id = s.createChat({ parentId: 'main', x: 0, y: 0, data: defaultChatData('b'), forkedFromMessageId: 'seed_main_a' }); await s.send(id, 'q');
  expect(m.calls.find(c => c.method === 'streamChat')!.args[0]).toMatchObject({ parentNodeId: 'main', forkedFromMessageId: 'seed_main_a' });
});
it('history mode lastK sends lastKMessages, auto sends null', async () => { /* patch advanced historyMode */ });
it('requestDelete on a chat asks first; on a source deletes at once with an Undo toast', () => {
  s.requestDelete('second'); expect(s.getSnapshot().ui.confirm!.text).toBe('Delete Q1.2 and its 1 branch? Sources on their desks stay on the board.');
  s.cancelConfirm(); s.requestDelete('csv'); expect(s.getSnapshot().cards.has('csv')).toBe(false); expect(s.getSnapshot().ui.toast!.undoCardId).toBe('csv');
});
it('confirm copy without branches', () => { s.requestDelete('deep'); expect(s.getSnapshot().ui.confirm!.text).toBe('Delete Q1.2.1? Sources on its desk stay on the board.'); });
it('deleting a streaming chat aborts its stream', async () => { /* firstTokenMs 50: send('side'), requestDelete('side'), confirmDelete → streaming has no side; no side_a stored */ });
it('undo restores the deleted set', async () => { /* requestDelete('second'); await confirmDelete(); await undo() → second, deep back; web.deskId 'second' */ });
it('the toast expires after toastMs', async () => { /* fake timers, toastMs 10000 → toast null at 10001 */ });
it('promote folds the siblings', () => { s.promote('side'); expect((s.getSnapshot().cards.get('second')!.data as ChatData).demoted).toBe(true); });
```

- [ ] **Step 2: Run to verify they fail** — `npx vitest run components/board/store.ui.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement the UI half of `store.ts`**
- [ ] **Step 4: Run all store tests** — `npx vitest run components/board`. Expected: PASS.
- [ ] **Step 5: Commit** — `feat(board): store UI state, branch drafts, streaming and delete with undo`.

---

### Task 9: Board shell, engine, card rendering, drag, test hook, stubs

Ports prototype 361–375 (DOM), 445–573 (addNode, render, srcHTML, chatHTML, tileHTML, metaOf, bind, act, jiggle, remove), 750–852 (camera, pointer routing, drag, pan, wheel), 855–864 (select/fade), 1192–1193 (tooltips), 1197–1209 and 1237 (frame: sizes, card transforms, opacity), 1281 (start: fit + first frame).

**Files:**
- Create: `components/board/Board.tsx`, `components/board/context.tsx`, `components/board/engine/types.ts`, `components/board/engine/board-engine.ts`, `components/board/engine/card-view.ts`, `components/board/engine/drag.ts`, `components/board/engine/test-hook.ts`, `components/board/chrome/escape.ts`, `components/board/chrome/Icon.tsx`, `e2e/board/helpers.ts`, `e2e/board/global.d.ts`, `e2e/board/shell.spec.ts`
- Create as stubs with final signatures (bodies filled by later tasks): `engine/desks.ts` (10), `engine/strings.ts` (11), `engine/piles.ts` (12), `engine/persistence.ts` (18), `chrome/SourceViewer.tsx` (13), `chrome/BranchSheet.tsx` (14), `chrome/FocusView.tsx` + `chrome/CompareSheet.tsx` (15), `chrome/AddMenu.tsx` + `chrome/DropOverlay.tsx` + `chrome/BoardInput.tsx` (16), `chrome/ZoomControl.tsx` + `chrome/TrailBar.tsx` + `chrome/BrandBar.tsx` (17), `chrome/DeleteConfirm.tsx` + `chrome/Toast.tsx` (19). Stub components return `null`; stub modules return no-ops (`deskAt` → null, `wireKeys` → [], `onWheel` → false, `isDirty` → false).
- Modify: `app/board-dev/board-dev.tsx` (mount the board), `e2e/board/dev-page.spec.ts` (also expect `.pb-root`)

**Interfaces:**
- Consumes: Tasks 4, 5, 6, 8.
- Produces:
```ts
// Board.tsx  ('use client')
export interface BoardProps { api: EngineApi; boardId: Id; onOpenBoard?: (id: Id) => void; onOpenSettings?: () => void; testHook?: boolean }
export function Board(p: BoardProps): JSX.Element;   // also the default export; keyed by boardId;
// root <div className={`pb-root ${bricolage.variable}`} data-board={boardId}>  (the integration plan's e2e selects [data-board])
// context.tsx
export function useBoard(): { store: BoardStore; engine: BoardEngine | null; props: BoardProps };
export function useSnapshot(): BoardSnapshot;        // useSyncExternalStore(store.subscribe, store.getSnapshot)
// engine/types.ts
export interface ViewNode extends LayoutItem { el: HTMLDivElement; s: Spring; o: Spring; front: number; open: boolean; fresh: boolean }
export interface EngineContext { store: BoardStore; springs: SpringSystem; camera: Camera; rm: boolean;
  root: HTMLElement; viewport: HTMLDivElement; world: HTMLDivElement; tubes: SVGSVGElement; knobs: HTMLDivElement;
  nodes: Map<Id, ViewNode>; size(): 'S' | 'M'; layout(): Layout; nextZ(): number;
  render(id: Id): void; renderAll(): void; jiggle(id: Id, amt?: number): void; s2w(cx: number, cy: number): [number, number];
  track(e: PointerEvent, move: (ev: PointerEvent) => void, up: (ev: PointerEvent) => void): void;
  modules: { desks: DesksModule; strings: StringsModule; piles: PilesModule; persistence: PersistenceModule } }
// stub module signatures (final)
export interface DesksModule { sync(): void; frame(z: number): void; deskAt(x: number, y: number, except?: ViewNode | null): Id | null;
  setHot(chatId: Id | null): void; onCardDropped(n: ViewNode): void; onChatDropped(n: ViewNode): void;
  fade(related: Set<Id> | null): void; deskBox(chatId: Id): Box | null; dispose(): void }
export interface StringsModule { frame(): void; startString(n: ViewNode, kind: 'src' | 'chat', e: PointerEvent): void; isLive(): boolean;
  wireKeys(): string[]; selectedWire(): string | null; clearWire(): boolean; wirePillOn(key: string): boolean;
  wirePoint(key: string, frac: number): [number, number] | null; clickDisconnect(key: string): void;
  stringMid(key: string): { y: number; ty: number } | null; dispose(): void }
export interface PilesModule { hoverTarget(n: ViewNode, ev: PointerEvent): ViewNode | null; drop(n: ViewNode, target: ViewNode): void;
  onWheel(e: WheelEvent): boolean; cycle(id: Id, dir: 1 | -1): void; front(id: Id): number; unstack(id: Id): void; dispose(): void }
export interface PersistenceModule { frame(now: number): void; isDirty(id: Id): boolean; dispose(): void }
// board-engine.ts
export class BoardEngine { constructor(o: { store: BoardStore; root: HTMLElement; rm: boolean }); readonly ctx: EngineContext;
  mount(): void; dispose(): void;
  fit(anim?: boolean): void; zoomBy(f: number): void; zoomAt(px: number, py: number, z: number, anim: boolean): void;
  camSnap(x: number, y: number, z?: number): void; center(): [number, number]; flyTo(id: Id): void; zoom(): number;
  onFrame(cb: (dt: number, now: number) => void): () => void;
  cardRect(id: Id): { l: number; t: number; r: number; b: number; rad: number } | null; setCardOpacity(id: Id, v: number | null): void;
  focusCompose(id: Id): void; focusNote(id: Id): void; focusDesc(id: Id): void;
  freeSpot(x: number, y: number, w: number, h: number): [number, number]; placeFor(deskId: Id | null, i: number, at: [number, number] | null): [number, number];
  deskAt(x: number, y: number): Id | null; spawnNote(x: number, y: number): Id; confirmBranch(): Id | null; downOnCard(): boolean;
  settled(): boolean }
// chrome/escape.ts
export function useEscape(active: boolean, onEscape: () => void): void;  // LIFO stack; Board's single keydown listener calls the top
// engine/test-hook.ts
export interface BoardTestHook {
  camSnap(x: number, y: number, z?: number): void; zoomAt(px: number, py: number, z: number, anim?: boolean): void; fit(anim?: boolean): void;
  cam(): { x: number; y: number; z: number }; size(): 'S' | 'M'; rerender(): void; settle(): Promise<void>;
  cards(): Card[]; edges(): Edge[]; card(id: Id): Card | undefined; chats(): Card[]; sources(): Card[];
  hasWire(sourceId: Id, chatId: Id): boolean; hasAnswer(fromChat: Id, toChat: Id): boolean;
  canPlug(fromId: Id, kind: 'src' | 'chat', chatId: Id): boolean;
  box(id: Id): [number, number, number, number]; deskBox(chatId: Id): [number, number, number, number] | null; deskChats(): Id[];
  snapBy(id: Id, dx: number, dy: number): void; stringMid(key: string): { y: number; ty: number } | null;
  live(): boolean; select(id: Id | null): void; selected(): Id | null; selectedWire(): string | null; wireKeys(): string[];
  wirePillOn(key: string): boolean; wirePoint(key: string, frac: number): [number, number] | null; clickDisconnect(key: string): void;
  dialog(): { mode: 'branch' | 'root' | 'edit'; parentId: Id | null; at: [number, number] | null } | null;
  openSheet(mode: 'branch' | 'root' | 'edit', id?: Id, at?: [number, number]): void; setDialogFirst(text: string): void; confirmDialog(): Id | null;
  viewer(): { cardId: Id; memberId: Id | null } | null; openViewer(id: Id, memberId?: Id): void;
  focus(): Id | null; openFocus(id: Id): void; menuOpen(): boolean; pileFront(id: Id): number;
  calls(): { method: string; args: unknown[] }[] }      // MockEngineApi.calls; [] for another api
export function installTestHook(engine: BoardEngine, store: BoardStore, api: EngineApi): () => void;   // sets/deletes window.__board
```
`BoardTestHook.box` uses current spring `x` plus `w`/`h`, as the prototype's `bx` does. `deskBox` = `geometry.deskBounds`.

**DOM contract** (fixed; tests and CSS use exactly these):
- Engine: `.pb-vp > .pb-world > svg.pb-tubes, div.pb-knobs, .desk[data-chat], .card[data-id]`.
- Card classes: `card`, `chat` | `src f-<family>`, `size-m` | `size-s`, `selected`, `faded`, `muted`, `reading`, `processing` | `failed` | `soon`, `lift`, `drop`, `target`, `empty`, `demoted`.
- Card children (prototype markup): `.face`, `.ttl`, `.meta`, `.mtag`, `.cbody`, `.ans(.live)`, `.qb`, `.thinking`, `.compose textarea`, `.send`, `.cfoot`, `.port.out[data-port="src"|"chat"]`, `.port.in`, `.tools [data-act="view"|"expand"|"unstack"|"del"]`, `.apill[data-act="open"|"branch"]`, `.note-in .n`, `.desc`, `.exl [data-ex]`, `.exl [data-mem]`, `.soon-pill`, `[data-retry]`, `[data-pastetext]`, `.stale`.
- Strings: `path.tube[data-key="t|<child>"]`, `path.bub`, `path.wire[data-key]`, `path.hit[data-key]`, `button.wk[data-key]`, `path.live`.
- Chrome:
  - top-level: `[data-pb="brand"]`, `[data-pb="add"]`, `.menu[data-pb="menu"] [data-m="note"|"chat"|"file"|"link"]`, `[data-pb="linkpop"] input`, `input[data-pb="filein"]`, `[data-pb="trail"]`, `[data-pb="zoom"] [data-z="in"|"out"|"fit"]`, `[data-pb="zoom"] .z`, `[data-pb="drop"]`
  - sheets and views: `.wrap[data-pb="sheet"] .dlg`, `.wrap[data-pb="viewer"] .vw`, `[data-pb="scrim"]`, `[data-pb="focus"]`, `.wrap[data-pb="compare"]`, `.wrap[data-pb="confirm"]`, `.pb-toast [data-act="undo"]`
  - tooltip: `.tip`
- Overlays stay mounted and toggle `.on`, as the prototype does, so exit transitions play.

Engine behaviour to port, with V3 changes:
- **Rendering.** View nodes are created from store `card` changes (pop-in when `fields` includes `'created'`), removed on `card-removed` (prototype `removeNode` fade, 230 ms; 0 under RM), and re-rendered on `card`, `messages`, `stream` (only `.ans.live` innerHTML on later deltas, as `stream()` lines 877–883 does), `reads` (all chats + sources) and `ui`. Pile members are never rendered. Chat width 320, source 212; in size S, 260 / 220.
- **Render guards** (lines 456–469): never re-render a note while its `.n` has focus; keep the compose draft, focus, desc caret and `.cbody` scrollTop.
- **Sources.** Markup follows `srcHTML` (486–517). `soon` cards get the `.soon-pill` (`Coming soon`) as the last child of `.sx` and keep their out-port, which shows for `ready` and `soon`. Tools: `view` for `ready` or `soon`; `expand` for ready non-notes; `unstack` for piles; `del` always (it calls `store.requestDelete`). A failed card shows `data.error` and Retry / Paste text (→ `store.retrySource` / `store.replaceWithNote`). The meta line shows `· <link icon> N chats` when wired (line 484).
- **Chats.** Markup follows `chatHTML` (518–536). Name = `data.name`, model dot/label = `modelInfo(data.model)`, persona tag = `personaLabel`. Messages render with `renderMarkdown`; the streaming text shows in `.ans.live`, or `.thinking` + `.skel` while empty, and `streaming.error` shows as `<p class="err">`. Footer counts come from `store.readsOf`: own = `isRead && !inherited`, up = `isRead && inherited`. `.stale` (`Source changed`) shows when a read source's `updatedAt` is after the chat's last assistant `createdAt`. A demoted chat renders the S-blob face with `.demoted`. While the chat streams, the compose button is disabled and the Open/Branch pills are hidden.
- **Card bindings.** Compose Enter / send → `store.send`. `[data-act="open"]` → `openFocus`; `branch` → `openDialog({ mode: 'branch', parentId, anchor })`; `view` → `openViewer`; `expand` toggles `n.open`. Excerpt / member chips → `setExcerpt` / `setMemberOff`. Note input and `.desc` input → `patchDataDebounced`.
- **Intro.** When a card's `status` turns `processing → ready` and `store.intro(id)` is `'single'` (and the card isn't a doc), set `n.open = true` and focus `.desc`. When it's `'multi'`, set `n.fresh = true`; the `Say what it's for` link opens the card and focuses `.desc` (lines 1113–1115, 562). Then `clearIntro`.
- **Pointer** (lines 772–851, `drag()` 792–834, `pan()` 835–839). Ports go to `strings.startString`. Hover calls `piles.hoverTarget` and `desks.deskAt` + `desks.setHot`. On release:
  - pile target → `piles.drop`
  - source: `store.setDesk(id, deskT)` if it changed; then, for a desk drop, land in place and `desks.onCardDropped`; otherwise momentum + `desks.onCardDropped`
  - chat: momentum for itself and its desk group, then `desks.onChatDropped`
  - click → `select`; a double click within 360 ms → `openFocus` (chat) or `openViewer` (source `ready` | `soon`)
  - wheel: `.cbody` passthrough → `piles.onWheel` → ctrl/meta zoom (`exp(-deltaY*.0105)`) → pan
- **Selection** (855–863). `ui.selected` drives `selected` / `faded` on cards, and `desks.fade(related)`. `related` = chat + ancestors + every `readsOf` card (for pile members, their pile).
- **Frame** (1199–1209). Size hysteresis: S below .42, back to M above .5; re-render all on change. Card transforms and opacity. Then call `desks.frame(z)`, `strings.frame()`, `persistence.frame(now)`, then `onFrame` subscribers.
- **Server positions.** On a `card` change whose `fields` include `x` or `y`, call `px.to(card.x)` / `py.to(card.y)` unless the node is dragging or `persistence.isDirty(id)`.
- **Mount.** When `board.viewport` exists, `camSnap(viewport.x, viewport.y, viewport.zoom)`; otherwise `fit(false)`.
- **`spawnNote(x, y)`** = `deskAt(x + 106, y + 40)` → `store.createNote` → `desks.onCardDropped` → `select` → `focusNote` (line 1138).
- **`confirmBranch()`** (lines 959–976): spot = `dialog.at`. Otherwise, with a parent, `freeSpot(p.px.t + p.w + 200, p.py.t - 40, 320, 320)`; without one, `freeSpot` at the camera centre − (150, 160). Then `store.confirmDialog(spot)`, select, `flyTo` (60 ms) unless `at`, and send the first question after 350 ms or focus the composer.
- **Escape fallback** (empty stack): blur the focused field → `strings.clearWire()` → `select(null)`.
- **Loading and error states.** While loading, the board shows the canvas colour and the brand only. On error: a centred `.float` box with `Couldn't open this board.` and a `Try again` `.btn` that calls `store.load()`.

`app/board-dev/board-dev.tsx` mounts `<Board api={new MockEngineApi(params)} boardId="b_seed" testHook onOpenBoard={setBoardId} />`. The api lives in `useState(() => …)`, so one mock per page load. Dev-only test seams:
- `board-dev.tsx` sets `window.__mock = api` and `window.__remount()`, which bumps a React key and remounts `<Board>` on the same mock.
- `MockEngineApi` has `static ApiError = ApiError`.
- `Board.tsx`, when `testHook` is set, mirrors `ui.toast?.text` into `window.__toastText`.

`e2e/board/helpers.ts`:
- `openBoard(page, query = '')`: goto `/board-dev${query}`, wait for `window.__board` and 12 `.card[data-id]`, then `settle()`
- `center(page, sel): Promise<[number, number]>`
- `dragPath(page, from, to, steps = 20, stepMs = 16)`
- `trackErrors(page): string[]`: `pageerror` plus console errors, ignoring `/Failed to load resource|next-auth|CLIENT_FETCH_ERROR|React DevTools/`

`global.d.ts` declares `interface Window { __board?: BoardTestHook }`.

- [ ] **Step 1: Write the failing e2e tests**

```ts
// e2e/board/shell.spec.ts
test('renders the seed board: 4 chats and 8 sources, pile members hidden', async ({ page }) => {
  const errs = trackErrors(page); await openBoard(page);
  await expect(page.locator('.card.chat')).toHaveCount(4); await expect(page.locator('.card.src')).toHaveCount(8);
  await expect(page.locator('[data-id="interviews_1"]')).toHaveCount(0); expect(errs).toEqual([]);
});
test('soon cards show the pill and stay unread', async ({ page }) => {
  await openBoard(page);
  for (const id of ['video', 'podcast', 'shot']) await expect(page.locator(`[data-id="${id}"] .soon-pill`)).toHaveText('Coming soon');
  await expect(page.locator('[data-id="main"] .cfoot')).toContainText('2 sources');
});
test('dragging a chat carries its desk', async ({ page }) => {
  await openBoard(page); const before = await page.evaluate(() => [window.__board!.box('main'), window.__board!.box('pdf')]);
  await dragPath(page, await center(page, '[data-id="main"] .mtag'), [(await center(page, '[data-id="main"] .mtag'))[0] + 150, (await center(page, '[data-id="main"] .mtag'))[1] + 80]);
  await page.evaluate(() => window.__board!.settle());
  const after = await page.evaluate(() => [window.__board!.box('main'), window.__board!.box('pdf')]);
  expect(after[1][0] - before[1][0]).toBeCloseTo(after[0][0] - before[0][0], 0);
});
test('click selects and fades unrelated cards', async ({ page }) => {
  await openBoard(page); await page.click('[data-id="side"] .ttl');
  expect(await page.evaluate(() => window.__board!.selected())).toBe('side');
  await expect(page.locator('[data-id="csv"]')).toHaveClass(/faded/);
});
test('double-click opens a chat in focus and a source in its viewer, without a stray note', async ({ page }) => {
  await openBoard(page); const n = await page.evaluate(() => window.__board!.sources().length);
  await page.dblclick('[data-id="main"] .ttl'); expect(await page.evaluate(() => window.__board!.focus())).toBe('main');
  expect(await page.evaluate(() => window.__board!.sources().length)).toBe(n);
});
test('typing survives a re-render', async ({ page }) => {
  await openBoard(page); await page.click('[data-id="main"] .ttl');
  await page.locator('[data-id="main"] .compose textarea').pressSequentially('draft');
  await page.evaluate(() => window.__board!.rerender());
  await expect(page.locator('[data-id="main"] .compose textarea')).toHaveValue('draft');
  await expect(page.locator('[data-id="main"] .compose textarea')).toBeFocused();
});
test('map mode below 42% shows pebbles; back above 50%', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.zoomAt(720, 450, .3, false)); await page.waitForTimeout(100);
  await expect(page.locator('.card.size-s')).toHaveCount(12);
  await page.evaluate(() => window.__board!.zoomAt(720, 450, .46, false)); await page.waitForTimeout(100);
  await expect(page.locator('.card.size-s')).toHaveCount(12);          // hysteresis
  await page.evaluate(() => window.__board!.zoomAt(720, 450, .6, false)); await page.waitForTimeout(100);
  await expect(page.locator('.card.size-m')).toHaveCount(12);
});
test('reduced motion: no looping animation, cards land at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await openBoard(page, '?firstTokenMs=3000');
  await page.click('[data-id="main"] .ttl'); await page.locator('[data-id="main"] .compose textarea').fill('hi'); await page.keyboard.press('Enter');
  expect(await page.locator('[data-id="main"] .thinking i').evaluate(e => getComputedStyle(e).animationName)).toBe('none');
  const from = await center(page, '[data-id="csv"] .meta'); await dragPath(page, from, [from[0] + 100, from[1]], 5);
  const b = await page.evaluate(() => window.__board!.box('csv')); await page.waitForTimeout(32);
  expect(await page.evaluate(() => window.__board!.box('csv'))).toEqual(b);
});
```

- [ ] **Step 2: Run to verify they fail** — `npx playwright test e2e/board/shell.spec.ts`. Expected: FAIL (no `.pb-root`, no hook).
- [ ] **Step 3: Implement the files and stubs listed above**
- [ ] **Step 4: Run to verify they pass** — `npx playwright test e2e/board/shell.spec.ts e2e/board/dev-page.spec.ts && npm test && npm run typecheck:board`. Expected: PASS.
- [ ] **Step 5: Look at it.** `npm run dev`, open `/board-dev` next to the prototype file at 1440×900, and compare the card faces. Fix any visible difference in this task.
- [ ] **Step 6: Commit** — `feat(board): engine shell, card rendering, drag and the dev test hook`.

---

### Task 10: Desks

Ports prototype 610 (makeDesk), 1238–1250 (desk frame: springs, empty state, tab label, dots, map-mode label growth), plus the calls into geometry from `drag()` 827–832 and `makeRoom` 690.

**Files:**
- Modify: `components/board/engine/desks.ts` (fill the stub)
- Test: `e2e/board/desks.spec.ts`

**Interfaces:**
- Consumes: `DesksModule` and `EngineContext` (Task 9); `deskBounds`, `deskAt`, `makeRoom`, `separateDesks` (Task 5); `deskOf`, `famOf` (Task 2).
- Produces: the filled `DesksModule`.
  - `sync()` keeps one `.desk[data-chat]` per live chat, inserted before the first world child; its 4 bound springs are `(.5, .55)`, snapped on first frame.
  - Tab = `.lb` name + up to 6 dots. A dot is `FAMC[family][1]`, with class `soon` (hollow) when the source's status is `soon`.
  - `.empty` when a chat has no desk sources.
  - `frame(z)` follows the label rule at lines 1248–1249.
  - `onCardDropped(n)` = `makeRoom(layout, n)` (which separates desks).
  - `onChatDropped(n)` = `separateDesks(layout, n.id)`.
  - The dragged source's own desk excludes it from bounds (line 1240).

- [ ] **Step 1: Write the failing tests**

```ts
test('every chat has a desk with its name and source dots', async ({ page }) => {
  await openBoard(page); await expect(page.locator('.desk[data-chat]')).toHaveCount(4);
  await expect(page.locator('.desk[data-chat="main"] .tab .lb')).toHaveText('How should I price Context Tree?');
  await expect(page.locator('.desk[data-chat="main"] .dots i')).toHaveCount(3);
  await expect(page.locator('.desk[data-chat="main"] .dots i.soon')).toHaveCount(1);
});
test('dropping a loose source on a desk puts it on that desk', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.fit(false));
  const d = await page.evaluate(() => window.__board!.deskBox('main'));   // pick a point inside, below the pdf
  /* drag podcast .meta to a free point inside main's desk; expect .desk[data-chat=main] has class hot during the move */
  expect(await page.evaluate(() => window.__board!.card('podcast')!.deskId)).toBe('main');
});
test('a new chat shows the empty desk hint', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => { window.__board!.openSheet('root'); window.__board!.confirmDialog(); });
  await expect(page.locator('.desk.empty')).toHaveCount(1);
});
test('zoomed out, desk names grow but never outgrow their desk', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.zoomAt(720, 450, .35, false)); await page.waitForTimeout(200);
  const t = await page.locator('.desk[data-chat="main"] .tab').evaluate(e => e.style.transform); expect(t).toMatch(/scale\(/);
});
test('selecting a chat fades unrelated desks', async ({ page }) => { /* select side → .desk[data-chat=second] has faded */ });
```

- [ ] **Step 2: Run to verify they fail** — `npx playwright test e2e/board/desks.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `desks.ts`**
- [ ] **Step 4: Run to verify they pass** — plus `npx playwright test e2e/board/shell.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit** — `feat(board): jelly desks with map-style labels and make-room on drop`.

---

### Task 11: Strings — tubes, wires, Disconnect, live string

Ports prototype 576–609 (stringPath, addTube, wireFor, disconnect), 627–661 (outPoint, endLive, startString incl. drag-to-branch), 770 (chatUnder), 1208–1236 (tube and wire frame: trail, flow bubbles, fade, sway, cleanup).

**Files:**
- Modify: `components/board/engine/strings.ts`
- Test: `components/board/engine/strings.test.ts`, `e2e/board/strings.spec.ts`

**Interfaces:**
- Consumes: `StringsModule`, `EngineContext` (Task 9); `canPlug`, `wireKey`, `tubeW`, `famOf`, `ancestors` (Task 2); `STRING_COL`, `FAMC` (Task 2); `store.connect`, `store.disconnect`, `store.openDialog`, `store.select` (Tasks 7–8).
- Produces: the filled `StringsModule`, plus pure exports `stringTarget(a: [number, number], b: [number, number]): [number, number]` (midpoint + 8 + dist·.06) and `stringD(a, b, outA: 1 | -1, inB: 1 | -1, mid: [number, number]): string`.
- Rules:
  - Tubes come from `parentId`, keyed `t|<child>`; width `tubeW` (+1 on the trail or while flowing).
  - Wires come from store edges `wire` / `answer`, keyed by `wireKey`, coloured `STRING_COL[family]` (answers `STRING_COL.answer`).
  - Every string keeps a midpoint spring pair `(.62, .45)`, created on first sight and removed when unseen.
  - Clicking a `.hit` toggles the selected wire; `.wk.on` shows the Disconnect pill at the midpoint; clicking it → `store.disconnect(edgeId)` + jiggle.
  - Live string: the end springs `(.3, 1)` follow the pointer; the target is found by `chatUnder` + `canPlug` (adds `.target` to the card and its `.port.in`).
  - On release: a target → `store.connect` and select the target. A chat kind over empty board that moved more than 40 → `store.openDialog({ mode: 'branch', parentId, at: [end.x + 6, end.y - 40] })`. Otherwise the end retracts with `(.26, 1)` and the string is removed within 2 px.
  - `.pb-root.stringing` while live. The tooltip is suppressed while live.
  - If `store.connect` returns null, retract. If the API refuses later, the edge disappears via the store (Task 7) and the wire is cleaned up in the next frame.

- [ ] **Step 1: Write the failing tests**

```ts
// strings.test.ts
it('the midpoint sags by 8 + 6% of the length', () => { expect(stringTarget([0, 0], [100, 0])).toEqual([50, 14]); });
it('the path runs from a to b', () => { const d = stringD([0, 0], [100, 0], 1, -1, [50, 14]); expect(d.startsWith('M0.0,0.0')).toBe(true); expect(d.endsWith('100.0,0.0')).toBe(true); });
```
```ts
// strings.spec.ts
test('dragging from a source port onto a chat strings it', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.camSnap(60, 260, .62)); await page.waitForTimeout(300);
  await dragPath(page, await center(page, '[data-id="podcast"] .port.out'), await center(page, '[data-id="side"] .ttl'));
  expect(await page.evaluate(() => window.__board!.hasWire('podcast', 'side'))).toBe(true);
});
test('release on empty board springs back', async ({ page }) => { /* note port → +60,+200; after 800 ms live() false and no wire from note */ });
test('chat port to empty board opens the branch sheet there', async ({ page }) => { /* deep port → +120,-260 → dialog() {mode:'branch', parentId:'deep', at: not null} */ });
test('chat port onto a chat shares its answer; ancestors are refused', async ({ page }) => {
  /* side port → second .ttl → hasAnswer('side','second') true; main port → deep .ttl → hasAnswer('main','deep') false */
});
test('clicking a string shows Disconnect; Disconnect removes it', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => { window.__board!.select(null); window.__board!.fit(false); }); await page.waitForTimeout(600);
  const pt = await page.evaluate(() => window.__board!.wirePoint('s|csv|deep', .35)); await page.mouse.click(pt![0], pt![1]);
  expect(await page.evaluate(() => [window.__board!.selectedWire(), window.__board!.wirePillOn('s|csv|deep')])).toEqual(['s|csv|deep', true]);
  await page.click('.wk[data-key="s|csv|deep"]'); expect(await page.evaluate(() => window.__board!.hasWire('csv', 'deep'))).toBe(false);
});
test('a refused string disappears with a toast', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => { const m = (window as any).__mock; m.failNext('createEdge', new m.constructor.ApiError(409, 'not_allowed')); });
  /* string podcast → side as in the first test; within 1 s hasWire('podcast','side') is false and window.__toastText === "Those two can't be strung together." */
});
test('branch strings sway', async ({ page }) => {
  await openBoard(page); const s = await page.evaluate(async () => { const b = window.__board!; b.snapBy('second', 0, 200); await new Promise(r => setTimeout(r, 60)); return b.stringMid('t|second'); });
  expect(Math.abs(s!.ty - s!.y)).toBeGreaterThan(5);
});
test('tubes bubble while a chat streams', async ({ page }) => { /* send on deep → path.bub.flow count ≥ 2 during thinking */ });
```
`window.__mock` (the dev page's `MockEngineApi`), `MockEngineApi.ApiError` (a static re-export of `ApiError`) and `window.__toastText` (the current `ui.toast` text, dev only) are added in Task 9. Task 11 only uses them, so its toast check does not wait for Task 19's `Toast` component.

- [ ] **Step 2: Run to verify they fail** — `npx vitest run components/board/engine/strings.test.ts && npx playwright test e2e/board/strings.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `strings.ts`**
- [ ] **Step 4: Run to verify they pass.** Expected: PASS.
- [ ] **Step 5: Commit** — `feat(board): swinging tubes and strings, port dragging and Disconnect`.

---

### Task 12: Piles

Ports prototype 725–747 (asMembers, pile, unstack, cyclePile slide), 805–810 (pile hover during drag), 844–848 (wheel accumulation), 497–506 (pile face and member list on the card).

**Files:**
- Modify: `components/board/engine/piles.ts`
- Test: `components/board/engine/piles.test.ts`, `e2e/board/piles.spec.ts`

**Interfaces:**
- Consumes: `PilesModule` (Task 9); `store.makePile`, `store.unstack`, `store.setMemberOff` (Task 7); `membersOf` (Task 2).
- Produces:
  - The filled `PilesModule`.
  - A pure export `wheelStep(state: { acc: number; t: number }, now: number, delta: number): { state: { acc: number; t: number }; flip: 0 | 1 | -1 }`: reset when `now - t > 260`; flip when `|acc| ≥ 60`.
  - The front member index lives on the view node (`n.front`) and is not persisted.
  - `cycle` clones `.face` as `.face.ghost` (without tools or ports) and runs both Web Animations from lines 745–746 (260 ms / 300 ms); under RM it only re-renders.
  - The front member's title and first excerpt fill the face; the meta line reads `PDF · 2 of 4` (or `Mixed · …`).
  - `hoverTarget` allows `ready` source on `ready` source, neither a note.
  - `drop(n, t)` → `store.makePile(n.id, t.id, [t.px.x, t.py.x])`.
  - `unstack(id)` → spots `[pile.x + (i % 2) * 24, pile.y + i * 96]`.

- [ ] **Step 1: Write the failing tests**

```ts
// piles.test.ts
it('small deltas add up before a flip', () => { let s = { acc: 0, t: 0 }; let r = wheelStep(s, 0, 30); expect(r.flip).toBe(0); r = wheelStep(r.state, 50, 40); expect(r.flip).toBe(1); });
it('a pause resets the count', () => { const r = wheelStep({ acc: 50, t: 0 }, 400, 20); expect(r.flip).toBe(0); expect(r.state.acc).toBe(20); });
```
```ts
// piles.spec.ts
test('scrolling over a pile flips it with a slide', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => { window.__board!.select(null); window.__board!.camSnap(-500, 0, .9); }); await page.waitForTimeout(300);
  const ttl = page.locator('[data-id="interviews"] .ttl'); await page.mouse.move(...await center(page, '[data-id="interviews"] .ttl'));
  const t0 = await ttl.innerText(); await page.mouse.wheel(0, 30); await page.mouse.wheel(0, 40); await page.waitForTimeout(90);
  await expect(page.locator('[data-id="interviews"] .face.ghost')).toHaveCount(1); await page.waitForTimeout(300);
  expect(await ttl.innerText()).not.toBe(t0); await expect(page.locator('[data-id="interviews"] .meta')).toContainText('2 of 4');
});
test('dropping a source on another makes a pile on that desk', async ({ page }) => {
  /* drag web .meta onto pdf .ttl → a new card with sourceType pile, deskId main, data.title 'Mixed pile'; web and pdf have pileId = it */
});
test('Unpile puts the members back on the board', async ({ page }) => { /* click interviews tools [data-act=unstack] → 4 new .card.src, interviews gone */ });
test('switching a member off removes it from what the chat reads', async ({ page }) => {
  /* expand interviews, click [data-mem="1"] → card('interviews_2').data.off true; second's .cfoot count drops by 1 */
});
```

- [ ] **Step 2: Run to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Implement `piles.ts`**
- [ ] **Step 4: Run to verify they pass.** Expected: PASS.
- [ ] **Step 5: Commit** — `feat(board): piles that flip with a slide, pile on drop, unpile`.

---

### Task 13: Source viewers

Ports prototype 980–1038 (transcriptOf, viewBody per type, openViewer, closeViewer), with V3 changes for `soon`.

**Files:**
- Modify: `components/board/chrome/SourceViewer.tsx`
- Create: `components/board/chrome/viewer-bodies.tsx`
- Test: `e2e/board/viewers.spec.ts`

**Interfaces:**
- Consumes: `useBoard`, `useSnapshot`, `useEscape` (Task 9); `store.closeViewer`, `openViewer`, `setExcerpt`, `patchDataDebounced`, `readsOf`, `fileUrl` (Tasks 7–8); `TYPE_INFO`, `modelInfo`, `qNum`, `membersOf`, `tokensOf` (Task 2).
- Produces: `export function SourceViewer(): JSX.Element`, mounted by `Board`, always rendered as `.wrap[data-pb="viewer"]` with `.on` while `ui.viewer` is set. `viewer-bodies.tsx` exports one component per source type: `ViewerBody({ card, members, url })`.

Bodies (prototype `viewBody`):

| source type | body |
|---|---|
| video | `.hero` (ytimg `hqdefault` when `ytid`, else the gradient + play), duration chip from meta, then `.soonbox` `Reading videos is coming soon` |
| audio | `.hero.audio` bars, `<audio controls src={fileUrl}>` when available, `.soonbox` `Reading audio is coming soon` |
| pdf | pages strip (count from `/(\d+) pages/` in meta, else 12, max 24; `.hit` pages from on-excerpt locators), Overview (`summary`), Key passages (toggle → `setExcerpt`) |
| doc / note | `textarea.editor` → `patchDataDebounced({ text })`, focused after 80 ms |
| web | `.webprev` with meta, title, summary; Sections the AI uses |
| csv | `.tbl` from `data.table` (else no table), then Rows the AI uses |
| image | `.imgbig` with `<img src={fileUrl}>` or the `.mock3` placeholder, then `.soonbox` `Reading images is coming soon` |
| pile | `N files in this pile` + `.members button` per member → `openViewer(pile, member.id)`. Each row also has a `.tog`-style switch (`[data-memoff]`, `aria-checked` = read) → `store.setMemberOff(member.id, !off)`; a member with `data.off` gets `.off` (opacity .45, strike-through title). The side panel shows `Back to the pile`. |

Side panel: What is this for? (`patchDataDebounced({ desc })`); Read by (chats whose `readsOf` has an `isRead` item for the card or its members); Size (`tokensOf`). The transform origin comes from `ui.viewer.anchor`. A click on the scrim closes the viewer; so does Escape via `useEscape`. On close, jiggle the card.

- [ ] **Step 1: Write the failing tests**

```ts
for (const id of ['video', 'pdf', 'note', 'interviews', 'csv', 'shot', 'web', 'podcast'])
  test(`double-click opens viewer: ${id}`, async ({ page }) => {
    await openBoard(page); await page.evaluate(() => window.__board!.fit(false)); await page.waitForTimeout(250);
    const [x, y] = await center(page, `[data-id="${id}"] .meta`); await page.mouse.click(x, y); await page.mouse.click(x, y); await page.waitForTimeout(400);
    expect((await page.evaluate(() => window.__board!.viewer()))?.cardId).toBe(id);
    await expect(page.locator('.wrap[data-pb="viewer"]')).toHaveClass(/on/);
    await page.keyboard.press('Escape'); expect(await page.evaluate(() => window.__board!.viewer())).toBeNull();
  });
test('soon viewers say what is coming', async ({ page }) => {
  await openBoard(page);
  for (const [id, text] of [['video', 'Reading videos is coming soon'], ['podcast', 'Reading audio is coming soon'], ['shot', 'Reading images is coming soon']]) {
    await page.evaluate(i => window.__board!.openViewer(i), id); await expect(page.locator('[data-pb="viewer"] .soonbox')).toHaveText(text); await page.keyboard.press('Escape');
  }
});
test('a pile member opens inside the pile and goes back', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.openViewer('interviews'));
  await page.locator('.members button').nth(1).click(); expect((await page.evaluate(() => window.__board!.viewer()))?.memberId).toBe('interviews_2');
  await page.getByText('Back to the pile').click(); expect((await page.evaluate(() => window.__board!.viewer()))?.memberId).toBeNull();
});
test('editing a note in its viewer saves once after typing stops', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.openViewer('note')); await page.locator('.editor').pressSequentially(' More.');
  await page.waitForTimeout(800);
  const calls = await page.evaluate(() => window.__board!.calls().filter(c => c.method === 'updateCard' && (c.args[1] === 'note')));
  expect(calls).toHaveLength(1);
});
test('a pile member can be switched off from the viewer', async ({ page }) => {
  /* openViewer('interviews'); click the second row's [data-memoff] → card('interviews_2').data.off true; row has .off; second's .cfoot count drops by 1 */
});
test('a passage can be left out from the viewer', async ({ page }) => { /* open pdf, click first .passages button → .off, card('pdf').data.excerpts[0].on false */ });
test('Read by lists the chats that read it', async ({ page }) => { /* open pdf → .used contains Q1, Q1.1, Q1.2, Q1.2.1 chips */ });
```

- [ ] **Step 2: Run to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Implement `SourceViewer.tsx` and `viewer-bodies.tsx`**
- [ ] **Step 4: Run to verify they pass.** Expected: PASS.
- [ ] **Step 5: Commit** — `feat(board): source viewers per type, with coming-soon media`.

---

### Task 14: Branch sheet

Ports prototype 895–958 (openDialog layout, estimate, renderDialog controls) and 977 (close on scrim).

**Files:**
- Modify: `components/board/chrome/BranchSheet.tsx`
- Create: `components/board/chrome/branch-estimate.ts`, `components/board/chrome/ModelPicker.tsx` (the only model picker; the integration plan's model lock edits this file and `lib/catalog.ts` only)
- Test: `components/board/chrome/branch-estimate.test.ts`, `e2e/board/branch-sheet.spec.ts`

**Interfaces:**
- Consumes: `ui.dialog` + `store.setDraft`, `closeDialog` (Task 8); `engine.confirmBranch()` (Task 9); `MODELS`, `MAIN_MODELS`, `PERSONAS`, `ADV_FIELD_MAP`, `modelInfo` (Task 2); `qNum`, `cut` (Tasks 2, 6).
- Produces:
  - `export function BranchSheet(): JSX.Element`, rendered as `.wrap[data-pb="sheet"]` with the prototype's controls; the ids `d-name`, `d-first`, `d-persona`, `d-inherit`, `d-temp`, `d-max`, `d-hist`, `d-k`, `d-topk`, `d-budget`, `d-ok`, `d-cancel` are kept.
  - `export function estimateTokens(d: BranchDraft, parent: { reads: Reads; messages: Message[] } | null): number` (prototype `estimate`, line 909), using `isRead` items' tokens.
- Copy:
  - titles `New branch` / `New question` / `Chat settings`
  - buttons `Create branch` / `Create` / `Save`
  - from line `From <Qn> <name cut 46>` / `Starts its own tree, with an empty desk.`
  - carry segments `Summary + last 2`, `Whole chat`, `Fresh start`
  - the Advanced labels and option lists exactly as lines 931–936
- `export function ModelPicker(p: { value: string /* engine id */; onChange: (engineId: string) => void }): JSX.Element` in `ModelPicker.tsx`. The sheet renders it under `Model`. Model pills: the three `MAIN_MODELS` + a More models `<select>` for the rest, each showing `MODELS[k].label` with its dot. The selected value is stored as `engineId`. A chat whose model isn't in the table shows its `modelInfo` label as a fourth pill.
- Choosing a persona pill fills `personaText` with the preset text.
- Enter in the name field confirms; Ctrl/Cmd+Enter in First question confirms; Escape (via `useEscape`) and a scrim click cancel.
- Focus goes to First question when it exists, else to Name.

- [ ] **Step 1: Write the failing tests**

```ts
// branch-estimate.test.ts
it('adds summary and desk reads like the prototype', () => {
  const reads = { chatId: 'p', items: [{ cardId: 'a', how: 'desk', via: 'p', inherited: false, hidden: false, state: 'ready', tokens: 1200 }], totalTokens: 1200 } as Reads;
  const d = { ...draft, carry: 'summary', inheritDesk: true, personaText: '', advanced: { ...DEFAULT_ADVANCED, externalContextTopK: 5 } };
  expect(estimateTokens(d, { reads, messages: [] })).toBe(Math.round(250 + 720 + 1200 * 6 / 6));
});
it('the budget caps the estimate', () => { /* contextBudgetTokens 500 → 500 */ });
it('fresh start adds nothing from the parent chat', () => { /* carry fresh, inheritDesk false → 250 */ });
```
```ts
// branch-sheet.spec.ts
test('Branch opens the sheet from that chat and creates the branch it describes', async ({ page }) => {
  await openBoard(page); await page.click('[data-id="main"] .apill[data-act="branch"]');
  await expect(page.locator('[data-pb="sheet"] h2')).toHaveText('New branch'); await expect(page.locator('[data-pb="sheet"] .from')).toContainText('Q1');
  await page.fill('#d-name', 'Team pricing'); await page.click('[data-model="gemini"]'); await page.click('[data-persona="skeptic"]');
  await expect(page.locator('#d-persona')).toHaveValue('Push back. Look for what could be wrong and say how sure you are.');
  await page.click('#d-inherit'); await page.click('[data-carry="whole"]'); await page.click('#d-ok');
  const c = await page.evaluate(() => window.__board!.chats().find(c => (c.data as any).name === 'Team pricing'));
  expect(c).toMatchObject({ parentId: 'main', data: { model: 'gemini/gemini-3-flash-preview', persona: 'skeptic', inheritDesk: false, carry: 'whole' } });
  await expect(page.locator(`path.tube[data-key="t|${c!.id}"]`)).toHaveCount(1);
});
test('Advanced controls map onto AdvancedSettings', async ({ page }) => {
  /* openSheet('branch','main'); open .adv; set #d-temp to 1.2, #d-max 2000, #d-hist lastK, #d-k 8, #d-topk 3, #d-budget 8000; create →
     data.advanced equals {temperature:1.2, maxOutputTokens:2000, historyMode:'lastK', lastKMessages:8, externalContextTopK:3, contextBudgetTokens:8000} */
});
test('the estimate follows excerpts per question', async ({ page }) => { /* #d-est text changes when #d-topk moves from 5 to 10 */ });
test('settings edits an existing chat', async ({ page }) => { /* openSheet('edit','side') → title 'Chat settings', button 'Save'; change name → card('side').data.name */ });
test('a first question is asked right away', async ({ page }) => { /* fill #d-first 'And agencies?' → create → new chat's messages contain that text within 2 s */ });
test('Escape and the scrim cancel', async ({ page }) => { /* dialog() null after each */ });
```

- [ ] **Step 2: Run to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run to verify they pass.** Expected: PASS.
- [ ] **Step 5: Commit** — `feat(board): branch sheet with model, persona, start mode and advanced settings`.

---

### Task 15: Focus view, compare, and the V2 features that must survive

Ports prototype 1041–1102 (openReader, closeReader, finishClose, timelineHTML, rowHTML, articleHTML, renderReader) and 1251–1257 (the clip-path morph in the frame). Adds the spec §7 survivals: model switch (the model chip opens Chat settings), web search toggle, re-ask in a new branch, compare/promote.

**Files:**
- Modify: `components/board/chrome/FocusView.tsx`, `components/board/chrome/CompareSheet.tsx`
- Create: `components/board/chrome/focus.css`
- Test: `e2e/board/focus.spec.ts`

**Interfaces:**
- Consumes: `ui.focus`, `ui.compare`, `ui.webSearch`, `streaming`, `messages` (Task 8); `store.send`, `setHidden`, `setWebSearch`, `openDialog`, `openViewer`, `openFocus`, `closeFocus`, `openCompare`, `closeCompare`, `promote`, `setDemoted`, `requestDelete`, `readsOf` (Tasks 7–8); `engine.onFrame`, `engine.ctx.springs`, `cardRect`, `setCardOpacity`, `jiggle` (Task 9); `renderMarkdown`, `formatWhen` (Task 6); `ancestors`, `qNum`, `modelInfo`, `personaLabel` (Task 2).
- Produces: `export function FocusView(): JSX.Element` (`[data-pb="scrim"]` + `[data-pb="focus"]`) and `export function CompareSheet(): JSX.Element` (`.wrap[data-pb="compare"]`).

Behaviour:
- **Morph.** A spring `prog` (`.48, .85`); open `(.5, .82) → 1`, close `(.38, 1) → 0`. The clip-path inset interpolates from `cardRect` to 4 px with radius `20·z → 40`; content opacity/translate and scrim follow line 1254. `finishClose` (line 1046) runs when settled near 0. Under RM it is instant.
- **Timeline** (1047–1056). The current chat's `when` is `Now`; others use `formatWhen(createdAt)`. `Branched, added <dots> N sources` comes from own items; a branch with `inheritDesk === false` adds `, fresh start`.
- **Connected sources** (1057–1061). Rows come from `readsOf(c).items`, members grouped into one row per pile (`<n> files`). The origin pill shows `qNum(via)`. Inherited rows toggle `setHidden` (`.off`); own rows open the viewer, or switch focus for an answer chat. A `soon` row shows `Coming soon` in its meta.
- **Main column.**
  - Title, meta (`<model> · <persona> · N turns · N sources · ≈ X.Xk tokens per question`, total as line 1071 with `isRead` tokens).
  - Messages: `.ub`, and `.art` with `renderMarkdown`; `.live` while streaming; the skeleton while empty. Web results become a `.webrow` list above the live answer.
  - The quote block goes after the first answer (line 1073).
  - `aacts`: `Copy` (→ `Copied`), `Branch from here`, cited dots.
- **User-message menu.** Hovering a `.ub` shows a small `Ask again in a new branch` pill. It calls `openDialog({ mode: 'branch', parentId: c.id, first: <its text>, forkedFromMessageId: <id of the assistant message before it, or null> })`.
- **Top bar.** `Board · Esc`, `Settings` (`openDialog({ mode: 'edit', chatId })`), and a `⋯` button opening a small `.menu` with `Compare with siblings` (only when the chat has siblings), `Bring back` (only when demoted), and `Delete question` (`requestDelete`).
- **Composer.** Textarea (Enter sends, disabled while streaming). Chips: `+ Source` (opens `input[data-pb="filein"]` targeting this chat's desk via a `CustomEvent('pb:pickfiles', { detail: { deskId } })` that Task 16's `AddMenu` listens for), the model chip (opens Chat settings), and `Web` (toggles `setWebSearch`; `.on` style when active). Send button.
- **Escape** via `useEscape(focus !== null, closeFocus)`.
- **Compare.** Columns for the chat and its siblings, each with Q chip, name, model dot and the last answer (`renderMarkdown`), plus a `Keep this one` button → `promote(id)` then `closeCompare()`. Columns scroll in sync (V2 compare's `scrollLinked` behaviour).

- [ ] **Step 1: Write the failing tests**

```ts
test('opening a chat shows its timeline and connected sources', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.openFocus('deep')); await page.waitForTimeout(700);
  await expect(page.locator('[data-pb="focus"] .tl .cur')).toContainText('Q1.2.1');
  await expect(page.locator('[data-pb="focus"] .tl button.st')).toHaveCount(2);
  await expect(page.locator('[data-pb="focus"] .srow')).toHaveCount(await page.evaluate(() => /* own 3 + web + pile row + main's 3 */ 8));
});
test('an inherited source can be left out here', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.openFocus('side'));
  await page.locator('[data-pb="focus"] .srow', { hasText: 'Pricing survey 2025' }).click();
  expect(await page.evaluate(() => (window.__board!.card('side')!.data as any).hide)).toContain('pdf');
  await expect(page.locator('[data-pb="focus"] .srow.off')).toHaveCount(1);
});
test('a follow-up streams into the focus view', async ({ page }) => {
  await openBoard(page, '?firstTokenMs=100&wordMs=5'); await page.evaluate(() => window.__board!.openFocus('main'));
  await page.locator('[data-pb="focus"] .fcomp textarea').fill('And annual?'); await page.keyboard.press('Enter');
  await expect(page.locator('[data-pb="focus"] .art').last()).toContainText('try $12 a month', { timeout: 5000 });
});
test('web search shows its results first', async ({ page }) => { /* click Web chip → .on; send → .webrow contains 'Pricing pages compared' */ });
test('re-ask a question in a new branch', async ({ page }) => {
  /* hover main .ub, click 'Ask again in a new branch' → dialog() mode branch parent main; sheet #d-first value = the question text */
});
test('Branch from here and Settings open the sheet', async ({ page }) => { /* [data-b] → mode branch parent; [data-settings] → mode edit */ });
test('compare keeps one sibling and folds the other', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.openFocus('side'));
  await page.click('[data-pb="focus"] [data-act="more"]'); await page.getByText('Compare with siblings').click();
  await expect(page.locator('[data-pb="compare"] .cmp-col')).toHaveCount(2);
  await page.locator('[data-pb="compare"] .cmp-col', { hasText: 'What does value-based pricing mean?' }).getByText('Keep this one').click();
  await expect(page.locator('.card[data-id="second"]')).toHaveClass(/demoted/);
});
test('Back and Escape return to the board', async ({ page }) => { /* openFocus main; Escape → after 800 ms focus() null and .card[data-id=main] opacity '' */ });
```

- [ ] **Step 2: Run to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run to verify they pass.** Expected: PASS.
- [ ] **Step 5: Commit** — `feat(board): focus view with timeline, connected sources, compare and re-ask`.

---

### Task 16: Adding things — Add menu, right-click, link pop, files, drop, paste, keys

Ports prototype 1105–1189 (KIND detection, addDetected, placeFor, addFiles, addLink, spawnNote, drop listeners, paste, file input, link pop, menus, keyboard) and 785–790 (double-click empty board, context menu).

**Files:**
- Modify: `components/board/chrome/AddMenu.tsx`, `components/board/chrome/DropOverlay.tsx`, `components/board/chrome/BoardInput.tsx`
- Test: `e2e/board/adding.spec.ts`

**Interfaces:**
- Consumes: `store.openMenu`, `closeMenu`, `openLinkPop`, `closeLinkPop`, `createSourceFromFile`, `createSourceFromLink`, `openDialog`, `setDropping`, `createNote`, `select`, `openFocus`, `openViewer` (Tasks 7–8); `engine.spawnNote`, `placeFor`, `freeSpot`, `deskAt`, `s2w`, `center`, `downOnCard`, `ctx.viewport` (Task 9); `useEscape` (Task 9).
- Produces:
  - `AddMenu`: the `[data-pb="add"]` button, `.menu[data-pb="menu"]`, `[data-pb="linkpop"]`, and `input[data-pb="filein"]` (`multiple`, hidden). It listens for `pb:pickfiles`.
  - `DropOverlay`: `[data-pb="drop"]` with `Drop to add` / `Drop on a desk to give it to that question. We'll work out what each file is.`
  - `BoardInput`: window `dragenter` / `dragleave` / `dragover` / `drop` / `paste` / `keydown` listeners, plus viewport `dblclick` and `contextmenu`. It renders nothing.
- Rules:
  - Menu items, copy and colours as line 1164 (`Note N`, `New question Q`, separator, `Upload files`, `Paste a link`). Placement: from Add, above the button with origin `0 100%`; from right-click, at the pointer.
  - Note from the menu: `engine.spawnNote` at the point, or at `freeSpot` near the centre (line 1172).
  - New question → `openDialog({ mode: 'root', at })`. Upload files → `filein.click()` with the desk under the point. Paste a link → link pop (input placeholder `Paste a link to a page or a YouTube video`, button `Add`); text without a scheme gets `https://`.
  - Files: each file → `store.createSourceFromFile(file, engine.placeFor(deskId, i, at), deskId, files.length === 1 ? 'single' : 'multi')`. No client-side type gate: the API decides, and the store shows its toast.
  - Paste outside fields while no sheet/viewer is open: an http(s) URL → link on the selected chat's desk (or the selected source's desk); other text → note `{ text: text.slice(0, 600), meta: 'Note · pasted' }` at `placeFor(deskId)`.
  - Keys when not typing and no overlay is open: `Enter` opens the selection (chat → focus; source `ready` | `soon` → viewer); `N` → note at a free spot near the centre; `Q` → root sheet. Ignored with meta/ctrl/alt.
  - Double-click on empty board → `spawnNote(x - 106, y - 30)`, only when `!engine.downOnCard()` and no overlay is open (line 787).

- [ ] **Step 1: Write the failing tests**

```ts
test('Add → Note spawns a note ready to type into', async ({ page }) => {
  await openBoard(page); const n = await page.evaluate(() => window.__board!.sources().filter(c => c.sourceType === 'note').length);
  await page.click('[data-pb="add"]'); await page.click('[data-pb="menu"] [data-m="note"]'); await page.keyboard.type('Ask Priya about the team plan');
  expect(await page.evaluate(() => window.__board!.sources().filter(c => c.sourceType === 'note').length)).toBe(n + 1);
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => window.__board!.sources().some(c => (c.data as any).text === 'Ask Priya about the team plan'))).toBe(true);
});
test('right-click opens the menu; Escape closes it', async ({ page }) => {
  await openBoard(page); await page.mouse.click(700, 120, { button: 'right' }); expect(await page.evaluate(() => window.__board!.menuOpen())).toBe(true);
  await page.keyboard.press('Escape'); expect(await page.evaluate(() => window.__board!.menuOpen())).toBe(false);
});
test('double-click empty board spawns a note; on a card it does not', async ({ page }) => { /* dblclick 1300,120 → +1 source; dblclick pdf .meta → +0 */ });
test('N and Q', async ({ page }) => { /* N → +1 note; Q → dialog() mode root */ });
test('one uploaded file asks what it is for', async ({ page }) => {
  await openBoard(page, '?ingestMs=200'); await page.click('[data-pb="add"]');
  const chooser = page.waitForEvent('filechooser'); await page.click('[data-m="file"]');
  await (await chooser).setFiles({ name: 'survey.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });
  await expect(page.locator('.card.src.processing')).toHaveCount(1);
  await expect(page.locator('.card.src .desc:focus')).toHaveCount(1, { timeout: 5000 });
});
test('rejected uploads leave no card and say why', async ({ page }) => {
  /* 5 MB buffer 'big.pdf' → no new card after 1 s, toast text 'That file is over 4 MB.'; 'clip.mov' → "Can't read that kind of file yet." */
});
test('a file that fails offers Retry and Paste text', async ({ page }) => { /* 'broken.pdf' → .card.failed [data-pastetext] → becomes a note card */ });
test('pasting a YouTube link makes a coming-soon video', async ({ page }) => {
  /* select main; dispatch paste event with text https://youtu.be/abc123 → new card sourceType video, status soon, data.ytid 'abc123', deskId 'main' */
});
test('pasting text makes a note', async ({ page }) => { /* meta 'Note · pasted' */ });
test('dropping files on a desk gives them to that question', async ({ page }) => {
  /* build a DataTransfer in the page with a File('a.md'); dispatch dragenter (overlay .on), then drop at a point inside deskBox('second') → card deskId 'second', overlay off */
});
```

- [ ] **Step 2: Run to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run to verify they pass.** Expected: PASS.
- [ ] **Step 5: Commit** — `feat(board): Add menu, right-click, drop and paste detection, N and Q keys`.

---

### Task 17: Zoom control, trail bar, brand and board switcher

Ports prototype 362 + 179–181 (brand), 367 + 852 + 201–203 (zoom), 865–871 + 197–200 (trail), and 1206 (zoom label).

**Files:**
- Modify: `components/board/chrome/ZoomControl.tsx`, `components/board/chrome/TrailBar.tsx`, `components/board/chrome/BrandBar.tsx`
- Create: `components/board/chrome/brand.css`
- Test: `e2e/board/chrome.spec.ts`

**Interfaces:**
- Consumes: `engine.zoomBy`, `zoomAt`, `fit`, `flyTo`, `zoom`, `onFrame` (Task 9); `store.select`, `renameBoard` (Tasks 7–8); `props.api.listBoards`, `createBoard`, `props.onOpenBoard`, `props.onOpenSettings` (Task 9); `ancestors`, `qNum` (Task 2).
- Produces:
  - `ZoomControl`: `[data-pb="zoom"]`. Out ×.8, in ×1.25 at the viewport centre, animated; fit animated. The `.z` label updates from `onFrame` (rounded %), not from React state per frame.
  - `TrailBar`: `[data-pb="trail"]`. With no chat selected: `Trail` + `Pick a chat to see the questions that led to it.`. Otherwise the path with Q chips; a click selects and flies.
  - `BrandBar`: `[data-pb="brand"]` (logo, `Context Tree`, board title). Clicking the title edits it inline; Enter or blur → `renameBoard`. Clicking the logo opens a `.menu` listing `listBoards()` (current one marked), `New board` (`createBoard({ id: newId('b'), title: 'Untitled board' })` then `onOpenBoard(id)`), and `API keys` (only when `onOpenSettings` is set).
  - `window` `resize` → `fit(true)` (line 1282), installed by ZoomControl.

- [ ] **Step 1: Write the failing tests**

```ts
test('zoom buttons and label', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.camSnap(0, 0, 1));
  await page.click('[data-pb="zoom"] [data-z="in"]'); await page.waitForTimeout(900); await expect(page.locator('[data-pb="zoom"] .z')).toHaveText('125%');
  await page.click('[data-pb="zoom"] [data-z="fit"]'); await page.waitForTimeout(900);
  expect(await page.evaluate(() => window.__board!.cam().z)).toBeLessThan(1.1);
});
test('the trail shows the path and flies to a step', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.select('deep'));
  await expect(page.locator('[data-pb="trail"] button')).toHaveCount(3); await expect(page.locator('[data-pb="trail"] button.here')).toContainText('Q1.2.1');
  await page.locator('[data-pb="trail"] button').first().click(); expect(await page.evaluate(() => window.__board!.selected())).toBe('main');
});
test('the brand shows and renames the board', async ({ page }) => {
  await openBoard(page); await expect(page.locator('[data-pb="brand"]')).toContainText('Pricing study');
  /* click title, type ' 2', Enter → calls() includes updateBoard with {title:'Pricing study 2'} */
});
test('New board opens it', async ({ page }) => { /* logo → New board → calls() has createBoard; .card.chat count becomes 1 (dev page remounts with the new id) */ });
```

- [ ] **Step 2: Run to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run to verify they pass.** Expected: PASS.
- [ ] **Step 5: Commit** — `feat(board): zoom control, trail bar and board switcher`.

---

### Task 18: Persistence — positions after the springs settle, viewport, no snap-back

**Files:**
- Modify: `components/board/engine/persistence.ts`
- Test: `components/board/engine/persistence.test.ts`, `e2e/board/persistence.spec.ts`

**Interfaces:**
- Consumes: `PersistenceModule`, `EngineContext` (Task 9); `store.savePositions`, `saveViewport`, `getSnapshot` (Task 7).
- Produces:
  - The filled `PersistenceModule`.
  - A pure export `collectMoved(nodes: Iterable<{ id: string; px: Spring; py: Spring }>, cards: ReadonlyMap<string, Card>): { id: string; x: number; y: number }[]`: targets differing from the store's `x`/`y` by more than .5, rounded to .1.
  - A pure export:
    ```ts
    class SettleTimer {
      constructor(delayMs: number /* 600 */, fire: () => void, now?: () => number);
      frame(active: boolean): void;
    }
    ```
    `frame(active)` is called every frame: `active` = any card spring not settled or any card dragging. It fires once, `delayMs` after the first non-active frame that follows activity; any activity restarts it.
- Wiring:
  - Positions: a `SettleTimer(600)` fires `collectMoved` and `store.savePositions` in chunks of 200.
  - Viewport: a second `SettleTimer(1000)` watches the camera springs and fires `store.saveViewport({ x, y, zoom })` when the camera moved since the last save.
  - `isDirty(id)` = the node's targets differ from the store's `x`/`y` (the same test as `collectMoved`), so Task 9's server-position rule skips it until it is saved.

- [ ] **Step 1: Write the failing tests**

```ts
// persistence.test.ts
it('fires once, 600 ms after the springs settle', () => {
  let t = 0, n = 0; const s = new SettleTimer(600, () => n++, () => t);
  s.frame(true); t = 100; s.frame(false); t = 699; s.frame(false); expect(n).toBe(0); t = 700; s.frame(false); expect(n).toBe(1); t = 2000; s.frame(false); expect(n).toBe(1);
});
it('activity restarts the wait', () => { /* settle, active again at +400, settle → fires 600 after the second settle */ });
it('collectMoved returns only moved cards, rounded', () => { /* spring t 10.04 vs card.x 10 → none; t 50.27 → {x: 50.3} */ });
```
```ts
// persistence.spec.ts
test('one save after a drop carries the dragged card and everything it nudged', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.fit(false)); await page.waitForTimeout(300);
  await dragPath(page, await center(page, '[data-id="podcast"] .ttl'), await center(page, '[data-id="second"] .cbody'), 25);
  expect(await page.evaluate(() => window.__board!.calls().filter(c => c.method === 'savePositions').length)).toBe(0);  // nothing mid-drag
  await page.evaluate(() => window.__board!.settle()); await page.waitForTimeout(700);
  const saves = await page.evaluate(() => window.__board!.calls().filter(c => c.method === 'savePositions'));
  expect(saves).toHaveLength(1); const ids = (saves[0].args[1] as any[]).map(p => p.id);
  expect(ids).toContain('podcast'); expect(ids.length).toBeGreaterThan(1);     // makeRoom / separateDesks moves ride along
});
test('a poll during an unsaved move does not snap the card back', async ({ page }) => {
  await openBoard(page, '?ingestMs=5000');      // keeps a card processing so the board polls
  /* upload a.pdf via filein; drag csv by +200px; immediately wait 2100 ms (a poll lands before/after save);
     box('csv') x stays within 2px of the dropped spot */
});
test('panning saves the viewport once', async ({ page }) => { /* drag empty board; after settle + 1 s, calls() has exactly one updateBoard with viewport */ });
test('a reload of the same mock keeps the layout', async ({ page }) => {
  /* drag csv, wait for the save; the hook remounts the board (window.__mock kept): board-dev exposes window.__remount() → box('csv') equals before ±1 */
});
```
`board-dev.tsx` (Task 9) exposes `window.__remount()`, which bumps a React key while keeping the same `MockEngineApi`. Task 9 adds it with `__mock`.

- [ ] **Step 2: Run to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run to verify they pass.** Expected: PASS.
- [ ] **Step 5: Commit** — `feat(board): save positions 600 ms after the springs settle, and the viewport`, with Why: `spec §7: one batch per settle, including make-room moves; a poll must not undo a local move`.

---

### Task 19: Delete confirm, toasts and Undo

**Files:**
- Modify: `components/board/chrome/DeleteConfirm.tsx`, `components/board/chrome/Toast.tsx`
- Test: `e2e/board/delete.spec.ts`

**Interfaces:**
- Consumes: `ui.confirm`, `ui.toast`, `store.requestDelete`, `confirmDelete`, `cancelConfirm`, `undo`, `dismissToast` (Task 8); `useEscape` (Task 9).
- Produces:
  - `DeleteConfirm`: `.wrap[data-pb="confirm"]` with the confirm text as `h2` (22px), buttons `Cancel` and `Delete` (`.btn.primary`); Enter confirms, Escape cancels. It also owns the board's `Delete` / `Backspace` key: when not typing and no overlay is open, the selected card → `store.requestDelete`.
  - `Toast`: `.pb-toast` with the text and, when `undoCardId` is set, `button[data-act="undo"]` `Undo` → `store.undo()`. It shows the latest toast only and fades with an opacity transition.

- [ ] **Step 1: Write the failing tests**

```ts
test('deleting a chat asks once, names its branches, and can be undone', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.select('second')); await page.keyboard.press('Delete');
  await expect(page.locator('[data-pb="confirm"] h2')).toHaveText('Delete Q1.2 and its 1 branch? Sources on their desks stay on the board.');
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('.card[data-id="second"], .card[data-id="deep"]')).toHaveCount(0);
  await expect(page.locator('.card[data-id="web"]')).toHaveCount(1);            // sources stay, loose
  expect(await page.evaluate(() => window.__board!.card('web')!.deskId)).toBeNull();
  await page.click('.pb-toast [data-act="undo"]'); await expect(page.locator('.card[data-id="deep"]')).toHaveCount(1);
  expect(await page.evaluate(() => window.__board!.card('web')!.deskId)).toBe('second');
});
test('removing a source needs no confirm and offers Undo for 10 s', async ({ page }) => {
  test.slow(); await openBoard(page); await page.hover('[data-id="csv"] .face'); await page.click('[data-id="csv"] [data-act="del"]');
  await expect(page.locator('[data-pb="confirm"]')).not.toHaveClass(/on/); await expect(page.locator('.pb-toast')).toContainText('Removed Competitor prices');
  await page.waitForTimeout(10_300); await expect(page.locator('.pb-toast [data-act="undo"]')).toHaveCount(0);
});
test('Escape cancels the confirm', async ({ page }) => { /* select deep, Delete, Escape → deep still there, no deleteCard call */ });
test('deleting a chat that is answering stops it', async ({ page }) => {
  /* ?firstTokenMs=2000: send on side, Delete side, confirm → after 2.5 s no messages stored for side's new id (calls has deleteCard, getMessages unchanged) */
});
```

- [ ] **Step 2: Run to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run to verify they pass.** Expected: PASS.
- [ ] **Step 5: Commit** — `feat(board): delete with one confirm and a 10 s Undo`.

---

### Task 20: Acceptance port — the prototype's checks against `/board-dev`

Ports `docs/design/prototype-tests/v4test.js` (24 checks) and `room.js` (6 checks) step by step. Same viewport (1440×900), same order, same waits, same camera calls, the prototype's globals replaced by `window.__board`. Screenshots keep the prototype's names so the owner can compare them side by side.

**Files:**
- Create: `e2e/board/v4.spec.ts`, `e2e/board/room.spec.ts`
- Modify: `docs/design/prototype-tests/README.md` (one paragraph: where the ported checks live and how to run them)

**Interfaces:**
- Consumes: every `BoardTestHook` method (Task 9) and the DOM contract.

Mapping (prototype → port):

| prototype | port |
|---|---|
| `camSnap(…)`, `fit(false)`, `zoomAt(…)`, `cam.x.x` | `__board.camSnap`, `.fit(false)`, `.zoomAt`, `.cam().x` |
| `nodes.get(a).links.has(b)` | `.hasWire(a, b)` |
| `nodes.get(b).uses.has(a)` | `.hasAnswer(a, b)` |
| `live` | `.live()` |
| `dlg.mode/parent/at` | `.dialog().mode/parentId/at` |
| `dlg.first = …; confirmDialog()` | `.setDialogFirst(…); .confirmDialog()` |
| `chats()`, `sources()` | `.chats()`, `.sources()` |
| `c.parent` | `c.parentId` |
| `canPlug(nodes.get(a), k, b)` | `.canPlug(a, k, b)` |
| `wires.get(k).hit` point | `.wirePoint(k, .35)` |
| `selWire`, `wires.get(k).k.classList.contains('on')` | `.selectedWire()`, `.wirePillOn(k)` |
| `[...wires.values()][0].k.click()`, `wires.size` | `.clickDisconnect(.wireKeys()[0])`, `.wireKeys().length` |
| `viewing.n.id` | `.viewer().cardId` |
| `openViewer(nodes.get(id))` | `.openViewer(id)` |
| `MENU.classList.contains('on')` | `.menuOpen()` |
| `#add`, `#menu [data-m="note"]`, `#rail` | `[data-pb="add"]`, `[data-pb="menu"] [data-m="note"]`, `#rail` (absent) |
| `strs.get('t|second').my`, `n.py.snap(+200)` | `.stringMid('t|second')`, `.snapBy('second', 0, 200)` |
| `openReader(id)` | `.openFocus(id)` |
| `nodes` box `bx` / `deskBounds(d)` / `desks` | `.box(id)` / `.deskBox(chat)` / `.deskChats()` |
| `n.desk` | `.card(id).deskId` |
| `[data-id="second"] .mtag` / `.cbody` / `.ttl` / `.meta` | unchanged (DOM contract) |

Two checks are tightened, because the prototype's versions always passed:
- 4 `main→deep blocked or allowed`: assert `hasAnswer('main', 'deep') === false` after the drag.
- The map and focus screenshots: assert `.card.size-s` count 12 at z .3, and `focus() === 'second'`.

The final `errors` print becomes `expect(errs).toEqual([])` using `trackErrors`.

- [ ] **Step 1: Write `v4.spec.ts`**

One `test.describe.serial` with a single page created in `beforeAll` (`openBoard(page)`, then wait 2500 ms as the prototype does). There is one `test.step` per prototype block (1 → 9 plus map/focus), and every prototype `ok(cond, msg)` becomes `expect.soft(cond, msg).toBe(true)`, so a run lists all 24 like the prototype's PASS/FAIL print. Screenshots go to `test-results/board/v4-<n>-<name>.png` with the prototype's suffixes (`-1-board` … `-12-focus`).

- [ ] **Step 2: Write `room.spec.ts`** the same way, with the six `room.js` checks and its screenshots (`-room`, `-room2`, `-room3`, `-map`).

- [ ] **Step 3: Run the acceptance specs**

Run: `npx playwright test e2e/board/v4.spec.ts e2e/board/room.spec.ts`
Expected: 24 + 6 soft assertions pass, 0 errors. If one fails, find its cause in the owning task's module (Tasks 9–19) and fix it there. Never loosen the assertion.

- [ ] **Step 4: Visual parity check**

Run the prototype's own script for reference screenshots: `node docs/design/prototype-tests/v4test.js "file:///D:/code/context_tree/ContextTree-src/docs/design/pebble-desks-prototype.html" test-results/proto/v4` (and `room.js` likewise). Put each pair side by side and list any visible difference in the task report for the owner. Don't tune the port by eye beyond fixing clear porting mistakes (wrong class, missing rule, wrong constant).

- [ ] **Step 5: Full verification**

Run: `npm test && npm run typecheck:board && npx playwright test`
Expected: all pass.

- [ ] **Step 6: Commit, then update context**

Commit `test(board): the prototype's 24 + 6 acceptance checks run against the port`, with Why: `spec §9: these checks must pass before the switch`. Then run `/ckic:continue` so `context/STATE.md` records the board frontend as built against the mock, plus the builder's calls (default model `gpt`, Kimi/Llama engine ids pending, contract requests), and commit that separately.

---

## Self-review notes

- **Spec coverage, §7.** Engine modules, springs, camera, frame loop, cards, strings/tubes, desks, makeRoom/separateDesks, piles, drag, live string → Tasks 4, 5, 9, 10, 11, 12. React chrome: branch sheet 14, viewers 13, focus view 15, Add + right-click menus 16, zoom + trail 17, board list 17, BYOK entry point 17 (`onOpenSettings`; the integration mounts the V2 dialog). Store 7–8. Position debounce 18. SSE semantics → `StreamEvent` handling in Task 8 (`delta`, `summary`, `web`, `error`, `done`; `<think>` stripped by markdown, Task 6). Pebble CSS and fonts 6. RM 4, 6, 9.
- **§7, prototype features carried 1:1.** Desks 10; wobble/jiggle 9; jelly desks 10; swinging strings 11; pill ports 11; string from a port 11; out-port to empty → branch sheet 11; click a string → Disconnect 11; double-click viewers 9, 13; Add + right-click + N/Q 16; drop/paste + "What is this for?" 9 (intro), 16; scroll flips piles 12; map-style labels 10; pebbles below 42% 9; makeRoom/separateDesks 5, 10; focus view with timeline and connected sources 15; leave inherited sources out 15.
- **§7, V2 survivals.** Continue on another AI (model chip → settings) 15; per-branch model and persona 14; compare/promote 15; BYOK hook 17; web search toggle 15; re-ask in a new branch 15.
- **§9.** The 24 + room checks → Task 20.
- **Delete, Undo and soon.** Deleting (§5.1) → Tasks 8, 19. Soon (§6) → Tasks 3, 9, 10, 13. Polling (§6) → Task 7.
- **Type consistency checked.** `readsOf`, `isRead`, `computeReads`; `DesksModule` / `StringsModule` / `PilesModule` / `PersistenceModule` names match between Task 9 and Tasks 10–12 and 18; `BoardTestHook` methods used in tests are all declared in Task 9; `store.confirmDialog(spot)` (Task 8) is called by `engine.confirmBranch()` (Task 9).
- **Paths the integration plan relies on.** `components/board/Board.tsx` (named + default `Board`, root `[data-board]`), `components/board/api/types.ts`, `components/board/api/mock/mock-engine-api.ts` (`MockEngineApi`, seed board id `SEED_BOARD_ID = 'b_seed'`), `components/board/api/ids.ts` (`newId`), the model table `components/board/lib/catalog.ts` (`MODELS`), the model picker `components/board/chrome/ModelPicker.tsx`, `vitest.config.ts` (includes `tests/unit/**`), `playwright.config.ts` (`testDir: 'e2e'`, webServer `next dev --port 3100`).
- **Folded into Task 9.** Dev-only `window.__mock`, `window.__remount()`, `window.__toastText` in `board-dev.tsx` / `Board.tsx`, used by Tasks 11, 18 and before Task 19.

## Contract changes requested

1. **`EngineApi.rawFileUrl(cardId: Id): string | null`.** The contract has `GET /files/{cardId}/raw`, but the interface has no way to get its URL. The image viewer, image tile and audio player need it. Http: `/api/engine/files/<id>/raw`; mock: object URL; null when there are no bytes.
   *Fallback if rejected:* the viewers show the placeholder (`.mock3`, bars) with no player.
2. ~~`SourceData.off?: boolean`~~ — accepted into the contract (2026-10-19); Tasks 2, 3, 12 and 13 use it.
3. **Read set for piles.** Clarify that `ReadItem.cardId` for a pile is each member (with the pile's `how`/`via`), and that a pile id in `ChatData.hide` hides all its members.
   *Fallback:* the mock and the board follow exactly this; the engine plan must match.
4. **Pin the default `ChatData.model`.** `POST /boards` creates q1 with "default ChatData" but doesn't name the model. Proposal: `openai/gpt-oss-120b` (live, free). The prototype default (Claude) needs BYOK, so the first question on a new board would fail for most users.
   *Fallback:* the board uses `MODELS.gpt.engineId` for new chats and shows whatever the engine sets on q1.
5. **For the owner and the engine, not the contract.** Two rows of the model table have no confirmed live engine route:
   - `kimi` → `moonshotai/kimi-k2-instruct` is not in the V2 catalogue.
   - `llama` → `meta-llama/llama-4-maverick-17b-128e-instruct` is a legacy entry.

   The table is one place (`lib/catalog.ts`) to change.

## Contract changes: resolved (2026-10-19, controller)

All accepted and written into the contract: `EngineApi.rawFileUrl`, piles expand to members in the read set
(a hidden pile hides all members), default model `openai/gpt-oss-120b`, `SourceData.off`. Kimi
(`moonshotai/…`) routes to NVIDIA NIM and Llama (`meta-llama/…`) to Groq through the engine's existing
prefix routing, so both rows stay; the live e2e (integration Task 6) uses the fake LLM, so a wrong id shows
up only on staging, where it is fixed in `catalog.ts`.
