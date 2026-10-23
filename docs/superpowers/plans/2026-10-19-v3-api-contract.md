# V3 board API contract

Shared by the three V3 plans (engine, board frontend, integration). Implements spec §5.1
(`docs/superpowers/specs/2026-10-19-v3-board-design.md`). If a plan needs a change here, change this file
first, in its own commit, and tell the other plans' executors.

## Transport

- Engine routes are mounted under `/api/v1` (and, like every engine router today, also with no prefix).
- The browser calls `/api/engine/<path>`. The Next proxy (`app/api/engine/[...path]/route.ts`) checks the
  NextAuth session, mints the backend JWT (`sub` = user email, as today) and forwards to
  `<ENGINE_BASE>/api/v1/<path>`. `ENGINE_BASE` = `LLM_API_URL` with the trailing `/api/v1/chat` removed.
- JSON everywhere except file upload (multipart) and file download (bytes). Field names are camelCase.
- Errors: HTTP status + body `{"error": "<code>", "detail": "<optional text>"}`.
  - 401 no or bad token · 404 board/card/edge missing, soft-deleted, or owned by someone else (never 403, so ids don't leak)
  - 400 `invalid` (bad body) · 409 `card_limit` | `duplicate` | `cycle` | `not_allowed` · 413 `too_large` · 415 `unsupported_type`
- Ids are made by the client: `<prefix>_<Date.now() base36>_<6 random [a-z0-9]>`; prefixes `b` board, `c` card,
  `e` edge. Message ids stay as V2 makes them (`genId()`), stored as `<base>_u` / `<base>_a`.
- Every create is idempotent: posting an id that already exists for this user returns `200` with the
  existing object (not a second row, not an error).

## Types (TypeScript; the engine's Pydantic models mirror them)

```ts
type Id = string;
type SourceType = 'note' | 'pdf' | 'doc' | 'web' | 'video' | 'audio' | 'csv' | 'image' | 'pile';
type Status = 'processing' | 'ready' | 'failed' | 'soon';
type Carry = 'summary' | 'whole' | 'fresh';

interface Excerpt { loc: string | null; text: string; on: boolean }

interface AdvancedSettings {            // same shape as V2 lib/advanced-settings.ts
  temperature: number | null;           // "creativity"
  maxOutputTokens: number | null;       // "longest answer"
  historyMode: 'auto' | 'lastK';        // "history"
  lastKMessages: number;                // default 6
  externalContextTopK: number;          // "excerpts per question", default 5
  contextBudgetTokens: number | null;   // "token budget"
}

interface ChatData {
  name: string;                         // the question's title
  model: string;                        // engine model id, e.g. "anthropic/claude-sonnet-4-5"
  persona: string;                      // preset key: none | skeptic | teacher | coach | analyst | custom
  systemPrompt: string;                 // the persona's text ('' for none)
  inheritDesk: boolean;                 // "Read the desk above", default true
  carry: Carry;                         // default 'summary'
  advanced: AdvancedSettings;
  hide: Id[];                           // inherited sources left out of this chat
  demoted?: boolean;                    // compare/promote
}

interface SourceData {
  title?: string;
  meta?: string;                        // card meta line, e.g. "PDF · 24 pages"
  desc?: string;                        // "What is this for?"
  text?: string;                        // note / doc body
  summary?: string;                     // overview made at ingest
  excerpts?: Excerpt[];                 // key passages; `on:false` = never sent
  url?: string;                         // web / video
  ytid?: string;                        // video
  fileName?: string; fileType?: string; fileSize?: number;
  table?: { columns: string[]; rows: string[][] };   // csv, first 200 rows
  error?: string;                       // when status = 'failed'
  off?: boolean;                        // pile member switched off: never read
  textChangedAt?: string;               // ISO; set by the client whenever it changes note/doc text (drives "Source changed")
}

interface Card {
  id: Id; boardId: Id;
  kind: 'chat' | 'source';
  sourceType: SourceType | null;        // null for chats
  x: number; y: number;
  deskId: Id | null;                    // source on a chat's desk
  pileId: Id | null;                    // source inside a pile
  parentId: Id | null;                  // chat lineage
  forkedFromMessageId: Id | null;
  status: Status | null;                // null for chats
  data: ChatData | SourceData;
  createdAt: string; updatedAt: string;
  messageCount?: number;                // chats only
  lastMessage?: { role: 'user' | 'assistant'; content: string } | null;  // chats; content ≤ 280 chars
}

interface Edge { id: Id; boardId: Id; kind: 'lineage' | 'wire' | 'answer'; from: Id; to: Id; createdAt: string }

interface Board {
  id: Id; title: string;
  viewport: { x: number; y: number; zoom: number } | null;
  cards: Card[]; edges: Edge[];
  createdAt: string; updatedAt: string;
}
interface BoardSummary { id: Id; title: string; updatedAt: string; cardCount: number }

interface Message { id: string; role: 'user' | 'assistant'; content: string; position: number; createdAt: string }

interface ReadItem {
  cardId: Id;
  how: 'desk' | 'wire' | 'answer';
  via: Id;                              // the chat it arrives through
  inherited: boolean;
  hidden: boolean;                      // in this chat's `hide` (still listed so the focus view can toggle it back)
  state: 'ready' | 'processing' | 'failed' | 'soon' | 'waiting';   // 'waiting' = answer chat with no answer yet
  tokens: number;                       // estimate, chars/4
}
interface Reads { chatId: Id; items: ReadItem[]; totalTokens: number }   // totalTokens counts only items the chat really reads
```

## Routes

| Method + path | Body | Success | Notes |
|---|---|---|---|
| `GET /boards` | — | 200 `{ boards: BoardSummary[] }` | only `board_version = 3`, not deleted, newest first |
| `POST /boards` | `{ id, title }` | 201 `Board` | also creates one chat card `id = "<boardId>_q1"` at (0,0) with default `ChatData` (`name: title`) |
| `GET /boards/{b}` | — | 200 `Board` | no messages; cards and edges not deleted |
| `PATCH /boards/{b}` | `{ title?, viewport? }` | 200 `{ ok: true }` | |
| `DELETE /boards/{b}` | — | 204 | soft (`canvases.deleted_at`) |
| `POST /boards/{b}/cards` | `{ id, kind, sourceType?, x, y, deskId?, pileId?, parentId?, forkedFromMessageId?, status?, data }` | 201 `Card` | 409 `card_limit` at 50 live cards. A chat with `parentId` gets lineage columns and a lineage edge `id = "lin_<cardId>"`. A note is created `status: 'ready'`. |
| `PATCH /boards/{b}/cards/{id}` | `{ data?, deskId?, pileId?, status? }` | 200 `Card` | `data` merges key by key (`data || patch`); `deskId` must be a live chat on this board, `pileId` a live pile, else 400 |
| `DELETE /boards/{b}/cards/{id}` | — | 200 `{ deleted: Id[] }` | chat: itself + all descendants + their non-lineage edges, one shared `deleted_at` stamp. Sources on a deleted chat's desk, and members of a deleted pile, are returned with `deskId`/`pileId` `null` while it stays deleted; the columns keep the id, so restore puts them back. |
| `POST /boards/{b}/cards/{id}/restore` | — | 200 `{ restored: Id[] }` | undoes exactly the set that DELETE returned (same `deleted_at` stamp) |
| `PATCH /boards/{b}/positions` | `{ positions: {id, x, y}[] }` (≤ 200) | 200 `{ updated: number }` | unknown ids ignored |
| `POST /boards/{b}/edges` | `{ id, kind: 'wire' \| 'answer', from, to }` | 201 `Edge` | wire: from = live source, to = live chat, source not on that chat's desk. answer: two live chats, not the same, not ancestor/descendant. Same (kind, from, to) twice → 409 `duplicate`; rule broken → 409 `not_allowed` |
| `DELETE /boards/{b}/edges/{id}` | — | 204 | lineage edge → 400 `invalid` |
| `GET /boards/{b}/cards/{id}/messages` | — | 200 `{ messages: Message[] }` | `inherited = false`, by `position` |
| `GET /boards/{b}/cards/{id}/reads` | — | 200 `Reads` | 400 if the card is not a chat |
| `POST /boards/{b}/sources/file` | multipart: `id`, `file`, `x`, `y`, `deskId?`, `desc?` | 202 `Card` | ≤ 4 MB (413). pdf, docx, txt, md, csv → `processing`, ingest in background. png, jpg, webp, gif, mp3, m4a, wav → `soon`. Anything else 415. |
| `POST /boards/{b}/sources/link` | `{ id, url, x, y, deskId?, desc? }` | 202 `Card` | youtube.com / youtu.be → `sourceType: 'video'`, `status: 'soon'`, `data.ytid`, `data.title` via oEmbed. Other http(s) → `web`, `processing`. Blocked by the SSRF guard → 400 `invalid`. |
| `GET /files/{cardId}/raw` | — | 200 bytes | original upload |
| `POST /chat/stream` | existing V2 body (below) | SSE | unchanged format |

Chat request body (V2 field names, plus optional `boardId`):
`{ message, message_id, nodeId, boardId?, model, systemPrompt, temperature, maxOutputTokens, lastKMessages,
externalContextTopK, webSearch, parentNodeId?, forkedFromMessageId?, regenerateLastUser? }`.
When `boardId` is present the turn is a V3 turn: the card must be a live chat on that board of this user
(else 404 `not_found`; a source card → 400 `invalid`), no node row is ever auto-created, and the engine ignores `contextNodeIds` and uses the read set, and takes
`carry` from the card's `data.carry`.

SSE frames (unchanged): `data: {"web_search":{"results":[{title,url}]}}` (optional, first) ·
`data: {"message":"<delta>"}` (repeated; reasoning inline as `<think>…</think>`) · `data: {"summary":"…"}` ·
`data: {"error":"…"}` · `data: [DONE]`.

## Clarifications (engine plan, 2026-10-19)

- An id that already exists but belongs to another user → 409 `duplicate`.
- `GET …/messages` on a source card → 400 `invalid`. An edge whose end card is missing or on another board → 404.
- Restoring a card whose parent is still deleted → 409 `not_allowed`. Restore or upload that would pass 50 live cards → 409 `card_limit`.
- Re-posting an existing source id → 200 with the existing card, no second ingest.
- Edges of every kind (lineage, wire, answer) appear in `GET /boards/{b}` only when both end cards are live.
- Every HTTP error, including 401 and 429, has the body `{error, detail}`.
- Board routes are rate-limited per user, not per IP (all traffic comes from the proxy's IPs).
- **Piles in the read set.** A pile never appears as a `ReadItem`; its members do, each with the pile's `how`/`via`. A pile id in `ChatData.hide` hides all its members.
- **Detach.** In `PATCH …/cards/{id}`, `deskId: null` / `pileId: null` detaches (an absent key leaves it unchanged).
- **Default model.** `POST /boards` gives the first chat `model: "openai/gpt-oss-120b"`; the board uses the same default for chats it creates.
- `HttpEngineApi.streamChat` sends `boardId` (from `ChatRequest.boardId`) and `canvasId` with the same value.

## Frontend interface (`components/board/api/types.ts`)

The board talks only to this interface. The board-frontend plan ships `MockEngineApi` (in memory, seeded
with the prototype's board); the integration plan ships `HttpEngineApi`.

```ts
interface CardCreate { id: Id; kind: 'chat' | 'source'; sourceType?: SourceType; x: number; y: number;
  deskId?: Id | null; pileId?: Id | null; parentId?: Id | null; forkedFromMessageId?: Id | null;
  status?: Status; data: Partial<ChatData> | SourceData }
interface CardPatch { data?: Partial<ChatData> | Partial<SourceData>; deskId?: Id | null; pileId?: Id | null; status?: Status }
interface ChatRequest { boardId: Id; chatId: Id; messageId: string; message: string; model: string;
  systemPrompt: string; temperature: number | null; maxOutputTokens: number | null; lastKMessages: number | null;
  externalContextTopK: number; webSearch: boolean; parentNodeId?: Id; forkedFromMessageId?: Id;
  regenerateLastUser?: boolean }
type StreamEvent =
  | { type: 'delta'; text: string } | { type: 'summary'; text: string }
  | { type: 'web'; results: { title?: string; url?: string }[] }
  | { type: 'error'; message: string } | { type: 'done' };

interface EngineApi {
  listBoards(): Promise<BoardSummary[]>;
  createBoard(input: { id: Id; title: string }): Promise<Board>;
  getBoard(boardId: Id): Promise<Board>;
  updateBoard(boardId: Id, patch: { title?: string; viewport?: Board['viewport'] }): Promise<void>;
  deleteBoard(boardId: Id): Promise<void>;
  createCard(boardId: Id, input: CardCreate): Promise<Card>;
  updateCard(boardId: Id, cardId: Id, patch: CardPatch): Promise<Card>;
  deleteCard(boardId: Id, cardId: Id): Promise<Id[]>;
  restoreCard(boardId: Id, cardId: Id): Promise<Id[]>;
  savePositions(boardId: Id, positions: { id: Id; x: number; y: number }[]): Promise<void>;
  createEdge(boardId: Id, input: { id: Id; kind: 'wire' | 'answer'; from: Id; to: Id }): Promise<Edge>;
  deleteEdge(boardId: Id, edgeId: Id): Promise<void>;
  getMessages(boardId: Id, chatId: Id): Promise<Message[]>;
  getReads(boardId: Id, chatId: Id): Promise<Reads>;
  uploadFile(boardId: Id, input: { id: Id; file: File; x: number; y: number; deskId?: Id | null; desc?: string }): Promise<Card>;
  addLink(boardId: Id, input: { id: Id; url: string; x: number; y: number; deskId?: Id | null; desc?: string }): Promise<Card>;
  streamChat(req: ChatRequest, onEvent: (e: StreamEvent) => void, signal?: AbortSignal): Promise<void>;
  rawFileUrl(cardId: Id): string | null;   // URL of GET /files/{cardId}/raw for <img>/<audio>; mock returns an object URL for files it was given, else null
}
class ApiError extends Error { status: number; code: string }   // thrown by both implementations
```

## Amendment 2026-10-20: citations and source passages (owner request)

Owner: "even if user click any citation we can open it at right with exact text they have referred to". Today the
board's "N of M cited" and the quote block are decoration (the first read sources), not real citations; they are
removed until this lands.

```ts
interface Citation {
  n: number;              // the marker number used in the answer text: "[n]"
  cardId: Id;             // the source card (or the chat whose answer was read)
  loc: string | null;     // the passage locator, e.g. "p. 4", "§ 2", "rows 1–50"
  page: number | null;    // 1-based PDF page when known
  quote: string;          // the passage text as stored (≤ 1200 chars); the prompt copy has bracketed numbers like [12] rewritten as (12)
}
interface Message { /* … */ citations?: Citation[] }        // assistant messages; only markers the answer used, by n
type StreamEvent = /* … */ | { type: 'citations'; citations: Citation[] };
interface Passage { loc: string | null; page: number | null; text: string }
// EngineApi
getPassages(cardId: Id): Promise<Passage[]>;
```

- The engine numbers every passage block it puts in the prompt (file chunks, notes, linked answers) as `[1]`, `[2]`, …
  and tells the model to cite with those markers right after the claim they support. `[2, 3]` is written as `[2][3]`.
- After the last delta and before `[DONE]` the stream sends one frame `data: {"citations":[…]}` with the markers the
  answer actually used that map to a sent passage (unknown numbers are dropped). The same list is stored with the
  assistant message and returned by `GET …/messages`. No citations → the frame is `[]`.
- `GET /files/{cardId}/passages` → 200 `{ passages: Passage[] }` in document order, for the user's own pdf, doc, web
  and csv sources; 400 `invalid` for other kinds; 404 if not theirs. The side panel uses it for text sources; PDFs
  render the original via `GET /files/{cardId}/raw` and highlight `quote` on `page`.
- Fake-LLM mode emits `[1]` after its first sentence when any passage was sent, so tests have a citation.

## Amendment 2026-10-20: app shell (board previews, BYOK turns)

```ts
type ProviderId = 'anthropic' | 'openai' | 'google' | 'groq' | 'deepseek' | 'mistral' | 'moonshot';
interface BoardPreviewCard { id: Id; kind: 'chat' | 'source'; sourceType: SourceType | null; x: number; y: number;
  deskId: Id | null; pileId: Id | null; parentId: Id | null; name?: string }   // name: chats only, ≤ 60 chars
interface BoardPreview { cards: BoardPreviewCard[]; edges: { kind: 'wire' | 'answer'; from: Id; to: Id }[] }
interface BoardSummary { id: Id; title: string; updatedAt: string; cardCount: number; preview?: BoardPreview }
type StreamErrorCode = 'missing_key' | 'key_rejected' | 'unsupported_model' | 'key_store_unavailable';
// StreamEvent's error member becomes:
//   | { type: 'error'; message: string; code?: StreamErrorCode; provider?: ProviderId }
```

- **(a) Board previews.** `GET /boards` adds `preview` to the 24 most recently updated boards. Cards are the live cards
  minus members of a live pile. Edges are the live `wire` and `answer` edges with both ends in `cards`. Lineage comes
  from `parentId`.
- **(b) BYOK turns.** `POST /chat/stream` with `boardId` (a V3 turn) uses only the user's stored key for the model's
  provider, never a server env key. Before streaming it answers:
  - 400 `{error:'missing_key', detail:'<provider>'}` when the user has no key for that provider;
  - 400 `{error:'unsupported_model', detail:'<model id>'}` for an id with no route;
  - 400 `{error:'key_rejected', detail:'<provider>'}` on the sync (non-stream) route when the provider refuses the key;
  - 503 `{error:'key_store_unavailable', detail:'<provider>'}` when the key store cannot be read (board copy: "Your keys
    can't be read right now. Try again in a minute.");
  - 500 `{error:'server_error'}` with generic text for operator misconfiguration (no detail leaks).

  A provider that refuses the key mid-stream sends the SSE frame `{"error":"<text>","code":"key_rejected","provider":"<provider>"}`
  with no `[DONE]` after it. The board shows these as "Add your <Provider> key" (missing or rejected) and re-asks once
  a key is saved.
- **(c) Model table.** Each model has one provider and one engine id that runs on that provider's key:

  | Model | Engine id | Provider |
  |---|---|---|
  | Claude Sonnet 4 | `anthropic/claude-sonnet-4-20250514` | anthropic |
  | GPT-5 mini | `openai/gpt-5-mini` | openai |
  | Gemini 3 Flash | `gemini/gemini-3-flash-preview` | google |
  | Llama 4 Maverick | `meta-llama/llama-4-maverick-17b-128e-instruct` | groq |
  | DeepSeek V3 | `deepseek/deepseek-chat` | deepseek |
  | Mistral Large | `mistral/mistral-large-latest` | mistral |
  | Kimi K2 | `moonshot/kimi-k2-0905-preview` | moonshot |

  Legacy ids on chats that already exist route as follows: `openai/gpt-oss-120b` and `openai/gpt-oss-20b` to groq (same
  id); `deepseek-ai/*` to deepseek `deepseek-chat`; `mistralai/*` to mistral `mistral-large-latest`; `moonshotai/*` to
  moonshot `kimi-k2-0905-preview`; other `anthropic/*`, `openai/gpt-5*` and `gemini/*` through the engine's alias tables.
  Anything else (`z-ai/*`, `groq/compound*`, `litellm/*`, unknown) is 400 `unsupported_model`.
- **Mock.** `MockEngineApi.listBoards` builds `preview`; `setKeys(providers | 'all')` (default `'all'`) says which
  providers are keyed; `streamChat` on a model whose provider is not keyed emits one
  `{type:'error', code:'missing_key', provider, message:'No <Name> key'}` and returns without storing the question.

## Amendment 2026-10-21: the engine runs on Vercel (Railway is down)

Owner decision: host the FastAPI engine as its own Vercel project (Hobby plan: 300 s per request, Fluid compute).
Work after a response is best-effort there, so source ingest no longer runs in FastAPI `BackgroundTasks`.

- `POST /boards/{b}/sources/file` and `POST /boards/{b}/sources/link` still return 202 with the card in `processing`,
  but they no longer start ingest themselves.
- New `POST /boards/{b}/cards/{id}/ingest` → 200 `Card`. Runs ingest for that source inside the request (≤ 280 s budget)
  and returns the card with its final status (`ready` / `failed`). Idempotent: a `ready`/`failed`/`soon` card returns
  as is; a card whose ingest started < 300 s ago returns 202 `{ status: "processing" }` without starting a second run
  (a lease stamp in the card's engine-only data); an older lease is taken over. Owner-scoped; 404/400 as other card routes.
- `HttpEngineApi.uploadFile` / `addLink` call the ingest route right after the 202 (the browser request keeps the function
  alive) and resolve with the 202 card as before; the board's normal poll shows the status change. `getBoard` re-kicks
  ingest (fire-and-forget, at most once per card per minute) for sources still `processing` whose lease has expired.
  The mock API needs no change.
- Migrations no longer run at engine start; they run as a one-off `python scripts/migrate.py` step against the target DB.

- 2026-10-21 note: cards may carry `data.color` (`'graphite'|'blue'|'teal'|'green'|'yellow'|'orange'|'red'|'pink'`; absent = default), set by the board via the normal PATCH. The engine stores `data` as-is.

## Amendment 2026-10-23: link preview for the paste box (polish-2 P11)
- `GET /links/preview?url=<encoded>` → 200 `{ url, kind: 'web' | 'video', title: string | null, site: string,
  description: string | null, image: string | null }`. Owner-agnostic but authenticated (same JWT as other routes),
  rate-limited per user. Same SSRF guard as `POST /sources/link` (http/https only, no private/loopback/link-local
  addresses after DNS resolution, redirects re-checked, ≤ 3 redirects), 4 s total timeout, reads at most 256 KB of HTML,
  parses `<title>`, `og:title`, `og:description`, `og:image`, `og:site_name`; YouTube via oEmbed. Nothing is stored.
  Blocked or unreachable → 400 `invalid` / 422 `unreachable`. `EngineApi.previewLink?(url)` is optional; without it the
  board builds a preview from the URL alone.
