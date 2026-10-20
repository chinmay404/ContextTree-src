/** Pure helpers for the focus view: the connected-sources rows and the timeline's "added N sources" (prototype rowHTML, timelineHTML). */
import type { Card, ReadItem } from '../api/types';
import { isRead } from '../lib/reads';
import type { Graph } from '../lib/graph';

export interface SourceRow {
  /** The card the row shows: a pile for its members, else the card itself. */
  card: Card;
  /** What `setHidden` takes: the pile id for a pile row, the card id otherwise. */
  hideId: string;
  items: ReadItem[];
  inherited: boolean;
  /** Every item is switched off here (left out, or a pile member turned off on its desk). */
  hidden: boolean;
  how: ReadItem['how'];
  via: string;
}

/** One row per card, members of a pile folded into their pile. Own rows first, in read order. */
/** `hide` is the chat's own leave-out list: an inherited row's toggle state comes from it alone, never from members switched off at their source. */
export function sourceRows(g: Graph, items: ReadItem[], hide?: string[]): SourceRow[] {
  const rows = new Map<string, SourceRow>();
  for (const it of items) {
    const c = g.cards.get(it.cardId);
    if (!c) continue;
    const pile = c.pileId ? g.cards.get(c.pileId) : undefined;
    const card = pile ?? c;
    const have = rows.get(card.id);
    if (have) { have.items.push(it); continue; }
    rows.set(card.id, { card, hideId: card.id, items: [it], inherited: it.inherited, hidden: false, how: it.how, via: it.via });
  }
  const out = [...rows.values()];
  for (const r of out) r.hidden = hide && r.inherited ? hide.includes(r.hideId) : r.items.every((i) => i.hidden);
  return out;
}

/** Rows that count as read by the chat (prototype readsOf: ready and not left out). */
export const readRows = (rows: SourceRow[]): SourceRow[] => rows.filter((r) => r.items.some(isRead));
