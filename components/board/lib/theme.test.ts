// @vitest-environment jsdom
import { THEME_KEY, THEME_SCRIPT, applyChoice, isDark, onThemeChange, readChoice, setChoice } from './theme';

const html = () => document.documentElement;
const media = (dark: boolean) => {
  const subs = new Set<() => void>();
  window.matchMedia = ((q: string) => ({
    matches: q.includes('dark') ? dark : false, media: q,
    addEventListener: (_: string, f: () => void) => subs.add(f), removeEventListener: (_: string, f: () => void) => subs.delete(f),
  })) as unknown as typeof matchMedia;
  return subs;
};

beforeEach(() => { localStorage.clear(); html().removeAttribute('data-theme'); media(false); });

describe('theme choice', () => {
  it('starts as System, and System follows the OS', () => {
    expect(readChoice()).toBe('system');
    expect(isDark()).toBe(false);
    media(true);
    expect(isDark()).toBe(true);
  });
  it('Light and Dark win over the OS, are remembered, and show on <html>', () => {
    media(true);
    setChoice('light');
    expect(html().getAttribute('data-theme')).toBe('light');
    expect(isDark()).toBe(false);
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
    expect(readChoice()).toBe('light');
    media(false);
    setChoice('dark');
    expect(isDark()).toBe(true);
    expect(readChoice()).toBe('dark');
  });
  it('System removes both the attribute and the stored choice', () => {
    setChoice('dark'); setChoice('system');
    expect(html().hasAttribute('data-theme')).toBe(false);
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
  });
  it('a stored value that is not a choice is System', () => {
    localStorage.setItem(THEME_KEY, 'purple');
    expect(readChoice()).toBe('system');
  });
  it('still applies when storage throws', () => {
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    expect(() => setChoice('dark')).not.toThrow();
    expect(isDark()).toBe(true);
    set.mockRestore();
  });
  it('tells subscribers when the choice or the OS changes', () => {
    const subs = media(false);
    const seen: number[] = [];
    const off = onThemeChange(() => seen.push(1));
    applyChoice('dark');
    expect(seen.length).toBe(1);
    subs.forEach((f) => f());
    expect(seen.length).toBe(2);
    off();
    applyChoice('light');
    expect(seen.length).toBe(2);
  });
});

describe('the pre-paint script', () => {
  const run = () => new Function(THEME_SCRIPT)();
  it('sets the attribute from a stored choice before anything is drawn', () => {
    localStorage.setItem(THEME_KEY, 'dark'); run();
    expect(html().getAttribute('data-theme')).toBe('dark');
  });
  it('leaves System alone and survives broken storage', () => {
    run();
    expect(html().hasAttribute('data-theme')).toBe(false);
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    expect(run).not.toThrow();
    get.mockRestore();
  });
});
