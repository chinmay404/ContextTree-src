import type { Card, Id, ReadItem, Reads } from '../api/types';
import { answersInto, chatData, deskOf, hasAnswer, isChat, membersOf, sourceData, tokensOf, wiresInto, type Graph } from './graph';

export const isRead = (i: ReadItem): boolean => !i.hidden && i.state === 'ready';

function itemFor(g: Graph, c: Card, how: ReadItem['how'], via: Id): ReadItem {
  const state: ReadItem['state'] = isChat(c) ? (hasAnswer(c) ? 'ready' : 'waiting') : (c.status ?? 'ready');
  return { cardId: c.id, how, via, inherited: false, hidden: false, state, tokens: tokensOf(g, c) };
}

/** A pile never appears as an item: its members do, each carrying the pile's how/via. */
function expand(g: Graph, c: Card, how: ReadItem['how'], via: Id): ReadItem[] {
  if (c.sourceType === 'pile') {
    return membersOf(g, c.id).filter((m) => sourceData(m).off !== true).map((m) => itemFor(g, m, how, via));
  }
  return [itemFor(g, c, how, via)];
}

/** The prototype's ctx(): what a chat reads, own first, then what it inherits from above. */
export function computeReads(g: Graph, chatId: Id): Reads {
  const chat = g.cards.get(chatId);
  if (!chat) return { chatId, items: [], totalTokens: 0 };
  const data = chatData(chat);
  const ownAll: ReadItem[] = [
    ...deskOf(g, chatId).flatMap((c) => expand(g, c, 'desk', chatId)),
    ...wiresInto(g, chatId)
      .map((e) => g.cards.get(e.from))
      .filter((c): c is Card => !!c && c.deskId !== chatId)
      .flatMap((c) => expand(g, c, 'wire', chatId)),
    ...answersInto(g, chatId)
      .map((e) => g.cards.get(e.from))
      .filter((c): c is Card => !!c)
      .flatMap((c) => expand(g, c, 'answer', chatId)),
  ];
  // First occurrence wins (desk, then wire, then answer): a pile member wired into the chat that holds its pile counts once.
  const own = ownAll.filter((i, n) => ownAll.findIndex((j) => j.cardId === i.cardId) === n);
  const ownIds = new Set(own.map((i) => i.cardId));
  const hide = data.hide ?? [];
  const up: ReadItem[] = chat.parentId && data.inheritDesk !== false
    ? computeReads(g, chat.parentId).items
        .filter((i) => !i.hidden && !ownIds.has(i.cardId))
        .map((i) => ({
          ...i,
          inherited: true,
          hidden: hide.includes(i.cardId) || hide.includes(g.cards.get(i.cardId)?.pileId ?? ''),
        }))
    : [];
  const items = [...own, ...up];
  return { chatId, items, totalTokens: items.filter(isRead).reduce((a, i) => a + i.tokens, 0) };
}
