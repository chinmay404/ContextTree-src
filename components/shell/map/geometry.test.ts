import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Spring } from '@/components/board/engine/spring';
import { deskBoxT, type Layout, type LayoutItem } from '@/components/board/engine/geometry';
import { MAP_SIZE, fitLabel, mapGeometry, LINEAGE_COLOR } from './geometry';
import type { BoardPreview, BoardPreviewCard } from './preview-types';

const chat = (id: string, x: number, y: number, o: Partial<BoardPreviewCard> = {}): BoardPreviewCard => ({
  id, kind: 'chat', sourceType: null, x, y, deskId: null, pileId: null, parentId: null, name: id, ...o,
});
const src = (id: string, x: number, y: number, deskId: string | null, sourceType: BoardPreviewCard['sourceType'] = 'pdf'): BoardPreviewCard => ({
  id, kind: 'source', sourceType, x, y, deskId, pileId: null, parentId: null,
});

describe('MAP_SIZE', () => {
  it('matches the board card widths', () => {
    const text = readFileSync(path.resolve(__dirname, '../../board/engine/card-view.ts'), 'utf8');
    const m = /export const CHAT_W = (\d+), SRC_W = (\d+)/.exec(text)!;
    expect(MAP_SIZE.chatW).toBe(Number(m[1]));
    expect(MAP_SIZE.srcW).toBe(Number(m[2]));
  });
});

describe('mapGeometry', () => {
  it('a missing or empty preview is one empty desk labelled with the title', () => {
    for (const p of [undefined, { cards: [], edges: [] }]) {
      const g = mapGeometry(p, { title: 'Pricing study' });
      expect(g.desks).toHaveLength(1);
      expect(g.desks[0].label).toBe('Pricing study');
      expect(g.desks[0].w).toBeGreaterThanOrEqual(300);
      expect(g.strings).toHaveLength(0);
    }
  });

  it('desk box equals deskBoxT on the same layout', () => {
    const preview: BoardPreview = { cards: [chat('c', 400, 100), src('a', 120, 90, 'c'), src('b', 130, 220, 'c', 'web')], edges: [] };
    const g = mapGeometry(preview);
    const mk = (id: string, x: number, y: number, w: number, h: number, isChat: boolean, deskId: string | null): LayoutItem => ({
      id, isChat, isPile: false, deskId, w, h, px: new Spring(x, 0.4, 1, true), py: new Spring(y, 0.4, 1, true), rot: new Spring(0, 0.4, 1, true),
    });
    const items = [mk('c', 400, 100, MAP_SIZE.chatW, MAP_SIZE.chatH, true, null), mk('a', 120, 90, MAP_SIZE.srcW, MAP_SIZE.srcH, false, 'c'), mk('b', 130, 220, MAP_SIZE.srcW, MAP_SIZE.srcH, false, 'c')];
    const l: Layout = { items: new Map(items.map((i) => [i.id, i])), chats: ['c'] };
    const [x0, y0, x1, y1] = deskBoxT(l, 'c');
    expect(g.desks[0]).toMatchObject({ chatId: 'c', x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  });

  it('an empty desk (no sources) is at least 300 wide', () => {
    const g = mapGeometry({ cards: [chat('c', 0, 0)], edges: [] });
    expect(g.desks[0].w).toBeGreaterThanOrEqual(300);
  });

  it('a child chat gets one lineage string in the edge colour', () => {
    const g = mapGeometry({ cards: [chat('p', 0, 0), chat('k', 700, 50, { parentId: 'p' })], edges: [] });
    expect(g.strings).toHaveLength(1);
    expect(g.strings[0].color).toBe(LINEAGE_COLOR);
    expect(g.strings[0].d.startsWith(`M${MAP_SIZE.chatW} 22 C`)).toBe(true);
  });

  it('a PDF wire takes the docs string token; an answer edge the answer token', () => {
    const g = mapGeometry({
      cards: [chat('a', 0, 0), chat('b', 700, 0), src('s', -300, 0, null, 'pdf')],
      edges: [{ kind: 'wire', from: 's', to: 'a' }, { kind: 'answer', from: 'a', to: 'b' }],
    });
    expect(g.strings.map((s) => s.color).sort()).toEqual(['var(--str-answer)', 'var(--str-docs)']);   // tokens, so a map follows light and dark
  });

  it('skips an edge to an unknown id', () => {
    const g = mapGeometry({ cards: [chat('a', 0, 0)], edges: [{ kind: 'wire', from: 'ghost', to: 'a' }] });
    expect(g.strings).toHaveLength(0);
  });

  it('a pile is 14 taller', () => {
    const g = mapGeometry({ cards: [chat('c', 300, 0), src('plain', 0, 0, 'c'), src('pile', 0, 150, 'c', 'pile')], edges: [] });
    const h = (id: string) => g.pebbles.find((p) => p.id === id)!.h;
    expect(h('pile')).toBe(h('plain') + MAP_SIZE.pileExtra);
  });

  it('box is the bounds padded by pad', () => {
    const a = mapGeometry({ cards: [chat('c', 0, 0)], edges: [] }, { pad: 0 });
    const b = mapGeometry({ cards: [chat('c', 0, 0)], edges: [] }, { pad: 70 });
    expect(b.box[0]).toBe(a.box[0] - 70);
    expect(b.box[2]).toBe(a.box[2] + 140); // box is a viewBox: x, y, width, height
  });
});

describe('fitLabel', () => {
  it('keeps a short label and cuts a long one with an ellipsis', () => {
    expect(fitLabel('Price it', 200)).toBe('Price it');
    const cut = fitLabel('A very long desk name indeed', 80);
    expect(cut.endsWith('…')).toBe(true);
    expect(cut.length).toBeLessThan(28);
  });
  it('always keeps at least three characters', () => {
    expect(fitLabel('abcdefghij', 5)).toBe('abc…');
  });
});

describe('mapGeometry colours are theme tokens, never literals', () => {
  it('pebbles and strings carry var(--...) values', () => {
    const g = mapGeometry({ cards: [chat('a', 0, 0), chat('b', 700, 0), src('s', -300, 0, null, 'pdf')], edges: [{ kind: 'wire', from: 's', to: 'a' }] });
    for (const p of g.pebbles) expect(p.fill).toMatch(/^var\(--/);
    for (const s of g.strings) expect(s.color).toMatch(/^var\(--/);
    expect(g.pebbles.find((p) => p.id === 's')!.fill).toBe('var(--fam-docs-fc)');
    expect(g.pebbles.find((p) => p.id === 'a')!.fill).toBe('var(--pb-card)');
  });
});
