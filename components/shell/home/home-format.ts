import { TYPE_INFO, type Family } from '@/components/board/lib/catalog';
import type { BoardSummary } from '@/components/board/api/types';
import type { BoardPreview } from '../map/preview-types';

export function greeting(hour: number): 'Good morning' | 'Good afternoon' | 'Good evening' {
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

export function firstName(name: string | null | undefined, email: string): string {
  const word = (name ?? '').trim().split(/\s+/)[0];
  return word || email.split('@')[0] || 'there';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "just now" | "12 min ago" | "2 h ago" | "yesterday" | "14 Oct". */
export function editedAgo(iso: string, now: number): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const s = Math.max(0, (now - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 172800) return 'yesterday';
  const d = new Date(t);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function metaLine(cardCount: number, questions: number): string {
  return `${cardCount} ${cardCount === 1 ? 'card' : 'cards'} · ${questions} ${questions === 1 ? 'question' : 'questions'}`;
}

/** Distinct source families on a board, first seen first, at most four. */
export function families(preview?: BoardPreview): Family[] {
  const out: Family[] = [];
  for (const c of preview?.cards ?? []) {
    if (c.kind !== 'source' || !c.sourceType) continue;
    const f = TYPE_INFO[c.sourceType]?.family;
    if (f && !out.includes(f)) out.push(f);
    if (out.length === 4) break;
  }
  return out;
}

export type SortKey = 'edited' | 'name';

export function sortBoards(list: BoardSummary[], key: SortKey): BoardSummary[] {
  const copy = [...list];
  if (key === 'name') return copy.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
  return copy.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
}

export function matchBoards(list: BoardSummary[], q: string): BoardSummary[] {
  const needle = q.trim().toLowerCase();
  return needle ? list.filter((b) => b.title.toLowerCase().includes(needle)) : list;
}
