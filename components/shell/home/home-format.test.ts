import { editedAgo, families, firstName, greeting, matchBoards, metaLine, sortBoards } from './home-format';
import type { BoardPreview, BoardPreviewCard } from '../map/preview-types';

const b = (id: string, title: string, updatedAt = '2026-10-20T10:00:00.000Z') => ({ id, title, updatedAt, cardCount: 1 });
const src = (id: string, sourceType: BoardPreviewCard['sourceType']): BoardPreviewCard => ({ id, kind: 'source', sourceType, x: 0, y: 0, deskId: null, pileId: null, parentId: null });

describe('greeting', () => {
  it('splits the day at 12 and 18', () => {
    expect(greeting(11)).toBe('Good morning');
    expect(greeting(12)).toBe('Good afternoon');
    expect(greeting(17)).toBe('Good afternoon');
    expect(greeting(18)).toBe('Good evening');
    expect(greeting(3)).toBe('Good morning');
  });
});

describe('firstName', () => {
  it('uses the first word of the name, else the email local part', () => {
    expect(firstName('Sam Rivera', 'x@y.z')).toBe('Sam');
    expect(firstName(null, 'sam.r@x.com')).toBe('sam.r');
    expect(firstName('  ', 'sam.r@x.com')).toBe('sam.r');
  });
});

describe('editedAgo', () => {
  const now = Date.parse('2026-10-21T12:00:00.000Z');
  const ago = (ms: number) => new Date(now - ms).toISOString();
  it('reads naturally', () => {
    expect(editedAgo(ago(59_000), now)).toBe('just now');
    expect(editedAgo(ago(12 * 60_000), now)).toBe('12 min ago');
    expect(editedAgo(ago(61 * 60_000), now)).toBe('1 h ago');
    expect(editedAgo(ago(2 * 3600_000), now)).toBe('2 h ago');
    expect(editedAgo(ago(25 * 3600_000), now)).toBe('yesterday');
    expect(editedAgo(ago(3 * 86400_000), now)).toBe('18 Oct');
  });
  it('survives a bad date', () => {
    expect(editedAgo('nope', now)).toBe('');
  });
});

describe('metaLine', () => {
  it('pluralises', () => {
    expect(metaLine(12, 4)).toBe('12 cards · 4 questions');
    expect(metaLine(1, 1)).toBe('1 card · 1 question');
  });
});

describe('families', () => {
  it('lists distinct source families in first-seen order, at most four', () => {
    const p: BoardPreview = { cards: [src('1', 'pdf'), src('2', 'doc'), src('3', 'web'), src('4', 'video'), src('5', 'csv'), src('6', 'image'), src('7', 'note')], edges: [] };
    expect(families(p)).toEqual(['docs', 'web', 'media', 'data']);
  });
  it('is empty without a preview', () => {
    expect(families(undefined)).toEqual([]);
  });
});

describe('sortBoards', () => {
  it('sorts by name case-insensitively and by edit time', () => {
    const list = [b('1', 'banana', '2026-10-01T00:00:00Z'), b('2', 'Apple', '2026-10-02T00:00:00Z'), b('3', 'cherry', '2026-10-03T00:00:00Z')];
    expect(sortBoards(list, 'name').map((x) => x.id)).toEqual(['2', '1', '3']);
    expect(sortBoards(list, 'edited').map((x) => x.id)).toEqual(['3', '2', '1']);
    expect(list.map((x) => x.id)).toEqual(['1', '2', '3']); // input untouched
  });
});

describe('matchBoards', () => {
  it('trims and ignores case', () => {
    const list = [b('1', 'Pricing study'), b('2', 'Berlin')];
    expect(matchBoards(list, '  PRIC ').map((x) => x.id)).toEqual(['1']);
    expect(matchBoards(list, '').map((x) => x.id)).toEqual(['1', '2']);
  });
});
