/**
 * Light / dark (P13). The choice is System (follow the OS), Light or Dark; it is kept per browser in localStorage and
 * shown as `data-theme` on <html> ("light" or "dark"; absent means System). THEME_SCRIPT runs in <head> before the first
 * paint so a dark choice never flashes white. The CSS reads the attribute (components/board/chrome/dark.css); the few
 * colours that live in JavaScript (the strings) ask isDark().
 */
export type ThemeChoice = 'system' | 'light' | 'dark';
export const THEME_KEY = 'ct-theme';

/** Inline, tiny, and safe without storage: put it first in <head>. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t)}catch(e){}})();`;

const listeners = new Set<() => void>();

export function readChoice(): ThemeChoice {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === 'dark' || t === 'light' ? t : 'system';
  } catch { return 'system'; }
}

/** What the page shows right now: the explicit choice, else the system preference. */
export function isDark(): boolean {
  if (typeof document === 'undefined') return false;
  const a = document.documentElement.getAttribute('data-theme');
  if (a === 'dark') return true;
  if (a === 'light') return false;
  return systemDark();
}

// The strings ask every frame, so the media query object is made once (and again only if matchMedia itself is replaced).
let mqSource: unknown = null;
let mqCache: MediaQueryList | null = null;
function systemDark(): boolean {
  if (typeof matchMedia !== 'function') return false;
  if (mqSource !== matchMedia) { mqSource = matchMedia; mqCache = matchMedia('(prefers-color-scheme: dark)'); }
  return !!mqCache?.matches;
}

export function applyChoice(c: ThemeChoice): void {
  if (typeof document === 'undefined') return;
  if (c === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', c);
  listeners.forEach((f) => f());
}

export function setChoice(c: ThemeChoice): void {
  try { if (c === 'system') localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, c); } catch { /* private window: the choice lasts this page */ }
  applyChoice(c);
}

/** Calls back when the choice or the system preference changes; returns the unsubscribe. */
export function onThemeChange(cb: () => void): () => void {
  listeners.add(cb);
  const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
  mq?.addEventListener('change', cb);
  return () => { listeners.delete(cb); mq?.removeEventListener('change', cb); };
}
