import type { Board, Card, ChatData, Edge, Id, SourceData } from '../api/types';
import { TYPE_INFO, type Family } from './catalog';
import { cut } from './format';

export type Graph = { cards: ReadonlyMap<Id, Card>; edges: ReadonlyMap<Id, Edge> };

export function graphOf(board: Board): Graph {
  return {
    cards: new Map(board.cards.map((c) => [c.id, c])),
    edges: new Map(board.edges.map((e) => [e.id, e])),
  };
}

export const chatData = (c: Card): ChatData => c.data as ChatData;
export const sourceData = (c: Card): SourceData => c.data as SourceData;
export const isChat = (c?: Card | null): boolean => !!c && c.kind === 'chat';

const byCreated = (a: Card, b: Card) =>
  a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
const all = (g: Graph) => [...g.cards.values()];

export const chatsOf = (g: Graph): Card[] => all(g).filter((c) => isChat(c)).sort(byCreated);
export const sourcesOf = (g: Graph): Card[] => all(g).filter((c) => !isChat(c) && !c.pileId);
export const kids = (g: Graph, id: Id): Card[] => chatsOf(g).filter((c) => c.parentId === id);

export function ancestors(g: Graph, id: Id): Card[] {
  const out: Card[] = [];
  const seen = new Set<Id>();
  let c = g.cards.get(id);
  while (c && c.parentId && !seen.has(c.parentId)) {
    seen.add(c.parentId);
    c = g.cards.get(c.parentId);
    if (c) out.push(c);
  }
  return out;
}

export function descendants(g: Graph, id: Id): Card[] {
  const out: Card[] = [];
  for (const k of kids(g, id)) out.push(k, ...descendants(g, k.id));
  return out;
}

export const deskOf = (g: Graph, chatId: Id): Card[] => all(g).filter((c) => !isChat(c) && c.deskId === chatId && !c.pileId);
export const membersOf = (g: Graph, pileId: Id): Card[] => all(g).filter((c) => c.pileId === pileId);
export const wiresInto = (g: Graph, chatId: Id): Edge[] => [...g.edges.values()].filter((e) => e.kind === 'wire' && e.to === chatId);
export const answersInto = (g: Graph, chatId: Id): Edge[] => [...g.edges.values()].filter((e) => e.kind === 'answer' && e.to === chatId);
export const edgesFrom = (g: Graph, id: Id): Edge[] => [...g.edges.values()].filter((e) => e.from === id);
export const wireKey = (e: Edge): string => `${e.kind === 'answer' ? 'a' : 's'}|${e.from}|${e.to}`;

export function qNum(g: Graph, id: Id): string {
  const c = g.cards.get(id);
  if (!c) return '';
  if (!c.parentId) return 'Q' + (chatsOf(g).filter((x) => !x.parentId).findIndex((x) => x.id === id) + 1);
  return qNum(g, c.parentId) + '.' + (kids(g, c.parentId).findIndex((x) => x.id === id) + 1);
}

export function nameOf(g: Graph, c: Card): string {
  if (isChat(c)) return `${qNum(g, c.id)} answer`;
  const d = sourceData(c);
  return d.title || cut(d.text || 'Note', 34);
}

export function famOf(g: Graph, c: Card): Family {
  if (isChat(c)) return 'answer';
  const type = c.sourceType ?? 'pdf';
  if (type === 'pile') {
    const fams = membersOf(g, c.id).map((m) => TYPE_INFO[m.sourceType ?? 'pdf'].family);
    const f = fams[0] ?? TYPE_INFO.pdf.family;
    return fams.every((x) => x === f) ? f : 'mixed';
  }
  return TYPE_INFO[type].family;
}

export const subtree = (g: Graph, id: Id): number => 1 + kids(g, id).reduce((a, k) => a + subtree(g, k.id), 0);
export const tubeW = (g: Graph, id: Id): number => 4 + 1.8 * (Math.sqrt(subtree(g, id)) - 1);

export function canPlug(g: Graph, fromId: Id, kind: 'src' | 'chat', chatId: Id): boolean {
  const n = g.cards.get(fromId);
  const c = g.cards.get(chatId);
  if (!n || !c || !isChat(c)) return false;
  if (kind === 'src') return n.deskId !== chatId && !wiresInto(g, chatId).some((e) => e.from === fromId);
  return chatId !== fromId
    && !answersInto(g, chatId).some((e) => e.from === fromId)
    && !ancestors(g, fromId).some((a) => a.id === chatId)
    && !ancestors(g, chatId).some((a) => a.id === fromId);
}

export function hasAnswer(c: Card): boolean {
  return (c.messageCount ?? 0) >= 2 || c.lastMessage?.role === 'assistant';
}

/** Pile members still switched on, else the excerpts that are on. */
const onCount = (g: Graph, c: Card): number =>
  c.sourceType === 'pile'
    ? membersOf(g, c.id).filter((m) => sourceData(m).off !== true).length
    : (sourceData(c).excerpts ?? []).filter((e) => e.on).length;

/** Mock-only estimate (prototype tokensOf); the engine's own estimate replaces it. */
export function tokensOf(g: Graph, c: Card): number {
  if (isChat(c)) return 420;
  if (c.status && c.status !== 'ready') return 0;
  const d = sourceData(c);
  const desc = Math.round((d.desc || '').length / 4);
  const t = c.sourceType;
  return desc + (t === 'note' || t === 'doc'
    ? Math.max(20, Math.round((d.text || '').length / 4))
    : t === 'pile' ? onCount(g, c) * 1400
    : t === 'image' ? 300
    : onCount(g, c) * 450 + 200);
}
