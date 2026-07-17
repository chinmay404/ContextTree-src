// ─── Shared console types ───────────────────────────────────
// Types used by more than one console part (orchestrator, chat tab,
// header). Pure helpers used by only one part live in that part's file.

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  /** Web-search sources the backend consulted for this reply (streamed as
      an SSE preamble; session-only — not persisted). */
  webSearch?: { results: { title?: string; url?: string }[] };
}

export interface ForkedNodeRef {
  _id: string;
  name?: string;
  type?: string;
  forkedFromMessageId?: string;
  forkedFromMessageRawId?: string;
  forkedFromMessageTimestamp?: string;
  forkedFromMessagePreview?: string;
}

export interface LineageEntry {
  id: string;
  name: string;
}
