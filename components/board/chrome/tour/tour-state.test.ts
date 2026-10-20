import { TOUR_KEY, TOUR_VERSION, readTourSeen, shouldShowTour, writeTourSeen } from './tour-state';

const mem = (init: Record<string, string> = {}): Storage => {
  const m = new Map(Object.entries(init));
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => { m.delete(k); },
    setItem: (k, v) => { m.set(k, String(v)); },
  };
};

describe('shouldShowTour', () => {
  it('shows on the first visit', () => {
    expect(shouldShowTour(null)).toBe(true);
  });
  it('stays closed after this version was finished or skipped', () => {
    expect(shouldShowTour({ version: TOUR_VERSION, at: 1, finished: true })).toBe(false);
    expect(shouldShowTour({ version: TOUR_VERSION, at: 1, finished: false })).toBe(false);
  });
  it('shows once more when the tour gains slides, even after a skip', () => {
    expect(shouldShowTour({ version: 1, at: 1, finished: false }, 2)).toBe(true);
    expect(shouldShowTour({ version: 2, at: 1, finished: false }, 2)).toBe(false);
  });
});

describe('readTourSeen / writeTourSeen', () => {
  it('round-trips', () => {
    const s = mem();
    writeTourSeen(true, s, 42);
    expect(readTourSeen(s)).toEqual({ version: TOUR_VERSION, at: 42, finished: true });
  });
  it('reads junk as never seen', () => {
    expect(readTourSeen(mem())).toBeNull();
    expect(readTourSeen(mem({ [TOUR_KEY]: '{oops' }))).toBeNull();
    expect(readTourSeen(mem({ [TOUR_KEY]: '"yes"' }))).toBeNull();
    expect(readTourSeen(mem({ [TOUR_KEY]: '{"version":"1"}' }))).toBeNull();
    expect(readTourSeen(null)).toBeNull();
  });
  it('survives storage that throws', () => {
    const s = mem();
    s.setItem = () => { throw new Error('QuotaExceededError'); };
    s.getItem = () => { throw new Error('SecurityError'); };
    expect(() => writeTourSeen(false, s)).not.toThrow();
    expect(readTourSeen(s)).toBeNull();
  });
});
