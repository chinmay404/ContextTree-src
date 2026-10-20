import { describe, expect, it } from 'vitest';
import { seedBoard } from '../api/mock/seed';
import { graphOf } from '../lib/graph';
import { computeReads } from '../lib/reads';
import { readRows, sourceRows } from './focus-rows';

const g = graphOf(seedBoard().board);

describe('sourceRows', () => {
  it('folds pile members into one row and keeps own rows first', () => {
    const rows = sourceRows(g, computeReads(g, 'deep').items);
    expect(rows).toHaveLength(8);
    expect(rows.slice(0, 3).every((r) => !r.inherited)).toBe(true);
    const pile = rows.find((r) => r.card.id === 'interviews')!;
    expect(pile.items).toHaveLength(4);
    expect(pile.hideId).toBe('interviews');
    expect(pile.via).toBe('second');
  });

  it('marks a left-out row hidden and drops it from the read rows', () => {
    const g2 = { cards: new Map(g.cards), edges: g.edges };
    const side = g2.cards.get('side')!;
    g2.cards.set('side', { ...side, data: { ...side.data, hide: ['pdf'] } });
    const rows = sourceRows(g2, computeReads(g2, 'side').items);
    expect(rows.find((r) => r.card.id === 'pdf')!.hidden).toBe(true);
    expect(readRows(rows).some((r) => r.card.id === 'pdf')).toBe(false);
  });

  it('hides every member of a pile hidden by its id', () => {
    const g2 = { cards: new Map(g.cards), edges: g.edges };
    const deep = g2.cards.get('deep')!;
    g2.cards.set('deep', { ...deep, data: { ...deep.data, hide: ['interviews'] } });
    const rows = sourceRows(g2, computeReads(g2, 'deep').items);
    expect(rows.find((r) => r.card.id === 'interviews')!.hidden).toBe(true);
  });
});
