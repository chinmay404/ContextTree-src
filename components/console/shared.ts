// ─── Shared console types ───────────────────────────────────
// Types used by more than one console part (orchestrator, chat tab,
// header). Pure helpers used by only one part live in that part's file.

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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
