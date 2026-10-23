// Contract types, verbatim from docs/superpowers/plans/2026-10-19-v3-api-contract.md.
// The board talks only to EngineApi; no other module in components/board/ may call the network.

export type Id = string;
export type SourceType = 'note' | 'pdf' | 'doc' | 'web' | 'video' | 'audio' | 'csv' | 'image' | 'pile';
export type Status = 'processing' | 'ready' | 'failed' | 'soon';
export type Carry = 'summary' | 'whole' | 'fresh';

export interface Excerpt { loc: string | null; text: string; on: boolean }

export interface AdvancedSettings {            // same shape as V2 lib/advanced-settings.ts
  temperature: number | null;           // "creativity"
  maxOutputTokens: number | null;       // "longest answer"
  historyMode: 'auto' | 'lastK';        // "history"
  lastKMessages: number;                // default 6
  externalContextTopK: number;          // "excerpts per question", default 5
  contextBudgetTokens: number | null;   // "token budget"
}

export interface ChatData {
  name: string;                         // the question's title
  model: string;                        // engine model id, e.g. "anthropic/claude-sonnet-4-5"
  persona: string;                      // preset key: none | skeptic | teacher | coach | analyst | custom
  systemPrompt: string;                 // the persona's text ('' for none)
  inheritDesk: boolean;                 // "Read the desk above", default true
  carry: Carry;                         // default 'summary'
  advanced: AdvancedSettings;
  hide: Id[];                           // inherited sources left out of this chat
  demoted?: boolean;                    // compare/promote
  color?: string | null;                // card colour key (lib/colors.ts); absent or null = default
}

export interface SourceData {
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
  color?: string | null;                // card colour key (lib/colors.ts); absent or null = default
  layout?: 'open' | null;               // a pile drawn open is a set: its members laid out in a box ('open'); absent = a stack
  textChangedAt?: string;               // ISO; set by the client whenever it changes note/doc text (drives "Source changed")
}

export interface Card {
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

export interface Edge { id: Id; boardId: Id; kind: 'lineage' | 'wire' | 'answer'; from: Id; to: Id; createdAt: string }

export interface Board {
  id: Id; title: string;
  viewport: { x: number; y: number; zoom: number } | null;
  cards: Card[]; edges: Edge[];
  createdAt: string; updatedAt: string;
}
export type ProviderId = 'anthropic' | 'openai' | 'google' | 'groq' | 'deepseek' | 'mistral' | 'moonshot';
/** One live card in a board's map. `name` is for chats only (at most 60 characters). */
export interface BoardPreviewCard { id: Id; kind: 'chat' | 'source'; sourceType: SourceType | null; x: number; y: number;
  deskId: Id | null; pileId: Id | null; parentId: Id | null; name?: string }
export interface BoardPreview { cards: BoardPreviewCard[]; edges: { kind: 'wire' | 'answer'; from: Id; to: Id }[] }
export interface BoardSummary { id: Id; title: string; updatedAt: string; cardCount: number; preview?: BoardPreview }

export interface Message { id: string; role: 'user' | 'assistant'; content: string; position: number; createdAt: string }

export interface ReadItem {
  cardId: Id;
  how: 'desk' | 'wire' | 'answer';
  via: Id;                              // the chat it arrives through
  inherited: boolean;
  hidden: boolean;                      // in this chat's `hide` (still listed so the focus view can toggle it back)
  state: 'ready' | 'processing' | 'failed' | 'soon' | 'waiting';   // 'waiting' = answer chat with no answer yet
  tokens: number;                       // estimate, chars/4
}
export interface Reads { chatId: Id; items: ReadItem[]; totalTokens: number }   // totalTokens counts only items the chat really reads

// ---- Frontend interface ----

export interface CardCreate { id: Id; kind: 'chat' | 'source'; sourceType?: SourceType; x: number; y: number;
  deskId?: Id | null; pileId?: Id | null; parentId?: Id | null; forkedFromMessageId?: Id | null;
  status?: Status; data: Partial<ChatData> | SourceData }
export interface CardPatch { data?: Partial<ChatData> | Partial<SourceData>; deskId?: Id | null; pileId?: Id | null; status?: Status }
export interface ChatRequest { boardId: Id; chatId: Id; messageId: string; message: string; model: string;
  systemPrompt: string; temperature: number | null; maxOutputTokens: number | null; lastKMessages: number | null;
  externalContextTopK: number; webSearch: boolean; parentNodeId?: Id; forkedFromMessageId?: Id;
  regenerateLastUser?: boolean }
export type StreamErrorCode = 'missing_key' | 'key_rejected' | 'unsupported_model' | 'key_store_unavailable';
export type StreamEvent =
  | { type: 'delta'; text: string } | { type: 'summary'; text: string }
  | { type: 'web'; results: { title?: string; url?: string }[]; query?: string }
  | { type: 'error'; message: string; code?: StreamErrorCode; provider?: ProviderId } | { type: 'done' };

/** What the paste box shows for a link before it is added (engine `GET /links/preview`, or built from the address alone). */
export interface LinkPreview { url: string; kind: 'web' | 'video'; title: string | null; site: string; description: string | null; image: string | null }

export interface EngineApi {
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
  /** Optional: without it the board previews a link from its address alone. Throws 400 invalid / 422 unreachable for a link that cannot be opened. */
  previewLink?(url: string, signal?: AbortSignal): Promise<LinkPreview>;
  rawFileUrl(cardId: Id): string | null;   // URL of GET /files/{cardId}/raw for <img>/<audio>; mock returns an object URL for files it was given, else null
}

export class ApiError extends Error {   // thrown by both implementations
  status: number;
  code: string;
  constructor(status: number, code: string, detail?: string) {
    super(detail ?? code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}
