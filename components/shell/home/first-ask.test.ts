import { cutTitle, peekFirstAsk, takeFirstAsk, takePendingAsk, writeFirstAsk, writePendingAsk } from './first-ask';

function store(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => { m.delete(k); },
    setItem: (k, v) => { m.set(k, String(v)); },
  };
}
const throwing = (): Storage => new Proxy({} as Storage, { get() { throw new Error('storage blocked'); } });

describe('first ask handoff', () => {
  it('write then take returns the text once, then null', () => {
    const s = store();
    writeFirstAsk('b_1', 'Why?', s);
    expect(takeFirstAsk('b_1', s)).toBe('Why?');
    expect(takeFirstAsk('b_1', s)).toBeNull();
  });
  it('another board id gets null and the value is kept', () => {
    const s = store();
    writeFirstAsk('b_1', 'Why?', s);
    expect(takeFirstAsk('b_2', s)).toBeNull();
    expect(takeFirstAsk('b_1', s)).toBe('Why?');
  });
  it('peek reads without clearing', () => {
    const s = store();
    writeFirstAsk('b_1', 'Why?', s);
    expect(peekFirstAsk('b_1', s)).toBe('Why?');
    expect(peekFirstAsk('b_1', s)).toBe('Why?');
  });
  it('a throwing storage never throws', () => {
    expect(() => writeFirstAsk('b_1', 'x', throwing())).not.toThrow();
    expect(takeFirstAsk('b_1', throwing())).toBeNull();
    expect(peekFirstAsk('b_1', throwing())).toBeNull();
    expect(() => writePendingAsk('x', throwing())).not.toThrow();
    expect(takePendingAsk(throwing())).toBeNull();
  });
  it('the pending ask round-trips once', () => {
    const s = store();
    writePendingAsk('Is a heat pump worth it?', s);
    expect(takePendingAsk(s)).toBe('Is a heat pump worth it?');
    expect(takePendingAsk(s)).toBeNull();
  });
});

describe('cutTitle', () => {
  it('trims, collapses whitespace and cuts at 80 with an ellipsis', () => {
    expect(cutTitle('  Is a  heat pump\nworth it? ')).toBe('Is a heat pump worth it?');
    const long = 'x'.repeat(200);
    expect(cutTitle(long)).toHaveLength(80);
    expect(cutTitle(long).endsWith('…')).toBe(true);
  });
});
