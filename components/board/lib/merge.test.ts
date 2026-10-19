import type { Card, SourceData } from '../api/types';
import { deepEqual, mergeCard, reconcile } from './merge';

const card = (id: string, over: Partial<Card> = {}, data: SourceData = {}): Card => ({
  id, boardId: 'b', kind: 'source', sourceType: 'pdf', x: 0, y: 0, deskId: null, pileId: null, parentId: null,
  forkedFromMessageId: null, status: 'ready', data, createdAt: 't', updatedAt: 't', ...over,
});
const opts = (over = {}) => ({
  pinned: new Set<string>(), hidden: new Set<string>(), merge: (s: Card) => s, same: (a: Card, b: Card) => deepEqual(a, b), ...over,
});

it('override wins over the server for pending keys only', () => {
  const server = card('c1', {}, { desc: 'a', title: 't' });
  const m = mergeCard(server, { fields: {}, data: { desc: 'b' } });
  expect(m.data).toEqual({ desc: 'b', title: 't' });
  expect(mergeCard(server, { fields: { deskId: 'x' }, data: {} }).deskId).toBe('x');
  expect(mergeCard(server)).toBe(server);
});

it('pinned local cards survive a snapshot without them', () => {
  const r = reconcile(new Map([['c1', card('c1')]]), [], opts({ pinned: new Set(['c1']) }));
  expect(r.next.has('c1')).toBe(true);
  expect(r.removed).toEqual([]);
});

it('unpinned cards absent from the server are removed', () => {
  const r = reconcile(new Map([['c1', card('c1')]]), [], opts());
  expect(r.removed).toEqual(['c1']);
  expect(r.next.size).toBe(0);
});

it('unchanged entities keep identity and emit nothing', () => {
  const local = card('c1');
  const r = reconcile(new Map([['c1', local]]), [card('c1')], opts());
  expect(r.changed).toEqual([]);
  expect(r.next.get('c1')).toBe(local);
});

it('reports x and y only when the server moved the card', () => {
  const local = new Map([['c1', card('c1', { x: 5 })]]);
  expect(reconcile(local, [card('c1', { x: 5 }, { title: 'n' })], opts()).changed).toEqual([{ id: 'c1', fields: ['data'] }]);
  expect(reconcile(local, [card('c1', { x: 9 })], opts()).changed).toEqual([{ id: 'c1', fields: ['x'] }]);
});

it('new server cards are reported as created; hidden ones are ignored and dropped', () => {
  const r = reconcile(new Map([['c2', card('c2')]]), [card('c1'), card('c2')], opts({ hidden: new Set(['c2']) }));
  expect(r.changed).toEqual([{ id: 'c1', fields: ['created'] }]);
  expect(r.removed).toEqual(['c2']);
});
