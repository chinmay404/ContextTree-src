import { seedBoard } from '../api/mock/seed';
import type { Board, ChatData, SourceData } from '../api/types';
import { graphOf } from './graph';
import { computeReads, countSources, foldPiles, isRead, tokensRead } from './reads';

const board = (): Board => seedBoard().board;
const g = graphOf(board());
const card = (b: Board, id: string) => b.cards.find((c) => c.id === id)!;

it('main reads its desk; the soon video is listed, not read', () => {
  const r = computeReads(g, 'main');
  expect(r.items.map((i) => [i.cardId, i.how, i.inherited, i.state])).toEqual([
    ['video', 'desk', false, 'soon'], ['pdf', 'desk', false, 'ready'], ['note', 'desk', false, 'ready']]);
  expect(r.totalTokens).toBe(r.items.filter(isRead).reduce((a, i) => a + i.tokens, 0));
  expect(r.totalTokens).toBeGreaterThan(0);
});

it('a branch inherits the desk above, via the chat it came from', () => {
  const items = computeReads(g, 'side').items;
  expect(items.length).toBe(3);
  expect(items.every((i) => i.inherited && i.via === 'main')).toBe(true);
});

it('second expands the pile into members', () => {
  const ids = computeReads(g, 'second').items.filter((i) => !i.inherited).map((i) => i.cardId);
  expect(ids).toEqual(['web', 'interviews_1', 'interviews_2', 'interviews_3', 'interviews_4']);
  expect(computeReads(g, 'second').items.find((i) => i.cardId === 'interviews_2')).toMatchObject({ how: 'desk', via: 'second' });
});

it('deep reads desk, wire, answer, then inherited', () => {
  const own = computeReads(g, 'deep').items.filter((i) => !i.inherited);
  expect(own.map((i) => [i.cardId, i.how])).toEqual([['shot', 'desk'], ['csv', 'wire'], ['side', 'answer']]);
  expect(own[0].state).toBe('soon');
});

it('hide marks the item hidden and drops it for descendants', () => {
  const b = board();
  (card(b, 'deep').data as ChatData).hide = ['pdf'];
  b.cards.push({ ...card(b, 'deep'), id: 'deeper', parentId: 'deep', createdAt: '2026-10-19T12:00:00Z', data: { ...(card(b, 'deep').data as ChatData), hide: [] } });
  const g2 = graphOf(b);
  const pdf = computeReads(g2, 'deep').items.find((i) => i.cardId === 'pdf')!;
  expect(pdf.hidden).toBe(true);
  expect(isRead(pdf)).toBe(false);
  expect(computeReads(g2, 'deeper').items.some((i) => i.cardId === 'pdf')).toBe(false);
});

it('hiding a pile id hides all its members', () => {
  const b = board();
  (card(b, 'deep').data as ChatData).hide = ['interviews'];
  const items = computeReads(graphOf(b), 'deep').items.filter((i) => i.cardId.startsWith('interviews_'));
  expect(items).toHaveLength(4);
  expect(items.every((i) => i.hidden)).toBe(true);
});

it('inheritDesk false reads nothing from above', () => {
  const b = board();
  (card(b, 'side').data as ChatData).inheritDesk = false;
  expect(computeReads(graphOf(b), 'side').items).toEqual([]);
});

it('a switched-off member is not read', () => {
  const b = board();
  (card(b, 'interviews_2').data as SourceData).off = true;
  const ids = computeReads(graphOf(b), 'second').items.map((i) => i.cardId);
  expect(ids).not.toContain('interviews_2');
  expect(ids).toContain('interviews_1');
});

it('an answer chat with no answer is waiting', () => {
  const b = board();
  const side = card(b, 'side');
  side.messageCount = 0;
  side.lastMessage = null;
  const r = computeReads(graphOf(b), 'deep');
  const item = r.items.find((i) => i.cardId === 'side')!;
  expect(item.state).toBe('waiting');
  expect(isRead(item)).toBe(false);
});

it('a pile member wired into the chat that holds its pile is listed and counted once', () => {
  const b = board();
  b.edges.push({ id: 'e_dup', boardId: b.id, kind: 'wire', from: 'interviews_1', to: 'second', createdAt: '2026-10-19T12:00:00Z' });
  const r = computeReads(graphOf(b), 'second');
  const mine = r.items.filter((i) => i.cardId === 'interviews_1');
  expect(mine).toHaveLength(1);
  expect(mine[0].how).toBe('desk');
  expect(r.totalTokens).toBe(computeReads(g, 'second').totalTokens);
});

it('countSources counts a pile as one source, not its members (pile of 4 + 1 loose → 2)', () => {
  const b = board();
  for (const c of b.cards) if (c.pileId) (c.data as SourceData).off = false;   // other tests switch a member off on the shared seed data
  const fresh = graphOf(b);
  const items = computeReads(fresh, 'second').items.filter((i) => !i.inherited);
  expect(items.length).toBe(5);                       // web + the 4 members
  expect(countSources(fresh, items)).toBe(2);
  expect(countSources(fresh, computeReads(fresh, 'second').items, true)).toBe(2);   // inherited: pdf + note (video is soon)
  expect(computeReads(fresh, 'second').totalTokens).toBe(computeReads(fresh, 'second').items.filter(isRead).reduce((a, i) => a + i.tokens, 0));
});

describe('R1: engine token figures and one dot per pile', () => {
  const r = computeReads(g, 'second');
  const pile = g.cards.get('interviews')!;

  it('tokensRead sums a pile over the members the chat reads, and is null for a card it does not read', () => {
    const members = r.items.filter((i) => i.cardId.startsWith('interviews_') && !i.inherited);
    expect(tokensRead(g, r.items, pile)).toBe(members.reduce((a, i) => a + i.tokens, 0));
    expect(tokensRead(g, r.items, g.cards.get('web')!)).toBe(r.items.find((i) => i.cardId === 'web')!.tokens);
    expect(tokensRead(g, r.items, g.cards.get('csv')!)).toBeNull();
    expect(tokensRead(g, [], pile)).toBeNull();
  });

  it('a hidden or left-out item is not a read figure', () => {
    const hidden = r.items.map((i) => (i.cardId === 'web' ? { ...i, hidden: true } : i));
    expect(tokensRead(g, hidden, g.cards.get('web')!)).toBeNull();
  });

  it('foldPiles turns members into their pile, once', () => {
    const read = r.items.filter(isRead).map((i) => g.cards.get(i.cardId)!);
    const folded = foldPiles(g, read);
    expect(folded.map((c) => c.id)).toEqual(['web', 'interviews', ...folded.map((c) => c.id).slice(2)]);
    expect(folded.length).toBe(countSources(g, r.items));
  });
});
