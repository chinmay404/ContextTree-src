import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { contrast } from '../lib/contrast';

const dir = 'components/board';
const read = (p: string) => readFileSync(join(dir, p), 'utf8');
const pebble = read('pebble.css'), materials = read('chrome/materials.css'), colors = read('chrome/colors.css'), dark = read('chrome/dark.css');
const shellTokens = readFileSync('components/shell/tokens.css', 'utf8');

/** `selector { a: b; c: d }` blocks, flattened out of any @media wrapper. */
function blocks(css: string): { sel: string; decls: Record<string, string> }[] {
  const out: { sel: string; decls: Record<string, string> }[] = [];
  for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]*;/g, '').matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
    const decls: Record<string, string> = {};
    for (const d of m[2].split(';')) { const i = d.indexOf(':'); if (i > 0) decls[d.slice(0, i).trim()] = d.slice(i + 1).trim(); }
    out.push({ sel: m[1].trim().replace(/\s+/g, ' '), decls });
  }
  return out;
}
const find = (css: string, sel: string) => blocks(css).find((b) => b.sel === sel)?.decls;

const explicit = blocks(dark.slice(0, dark.indexOf('@media')));
const system = blocks(dark.slice(dark.indexOf('@media')));
const EXPLICIT = 'html[data-theme="dark"]', SYSTEM = 'html:not([data-theme="light"])';

const lightRoot = { ...find(pebble, '.pb-root')!, ...find(materials, '.pb-root.pb-root')! };
const darkRoot = { ...find(dark, `${EXPLICIT} .pb-root`)!, ...find(dark, `${EXPLICIT} .pb-root.pb-root`)! };

describe('dark theme', () => {
  it('has the same rules for an explicit choice and for the system preference', () => {
    expect(explicit.length).toBeGreaterThan(10);
    expect(system.map((b) => b.sel.replace(SYSTEM, EXPLICIT))).toEqual(explicit.map((b) => b.sel));
    expect(system.map((b) => b.decls)).toEqual(explicit.map((b) => b.decls));
  });

  it('re-defines every colour token the light board defines (so no light value leaks into dark)', () => {
    const NOT_COLOURS = new Set(['--ease-out', '--r-tile', '--r-row', '--r-card', '--r-sheet', '--pb-font']);
    const colourTokens = Object.keys(lightRoot).filter((k) => k.startsWith('--') && !NOT_COLOURS.has(k));
    expect(colourTokens.length).toBeGreaterThan(30);
    const missing = colourTokens.filter((k) => !(k in darkRoot));
    expect(missing).toEqual([]);
  });

  it('re-defines every family and card-colour tone, with the same five tokens', () => {
    const light = [...blocks(pebble), ...blocks(colors)].filter((b) => /^\.pb-root \.(f|tone)-\w+$/.test(b.sel));
    expect(light.length).toBe(7 + 8);
    for (const b of light) {
      const d = find(dark, `${EXPLICIT} ${b.sel}`);
      expect(d, b.sel).toBeTruthy();
      expect(Object.keys(d!).sort(), b.sel).toEqual(Object.keys(b.decls).sort());
    }
  });

  it('the shell re-defines its tokens too', () => {
    const lightShell = find(shellTokens, '.ct-shell')!, darkShell = find(dark, `${EXPLICIT} .ct-shell`)!;
    const NOT = new Set(['--r-tile', '--r-row', '--r-card', '--r-sheet', '--ease-out', 'font-family', 'font-variant-numeric', 'color', '-webkit-font-smoothing']);
    const missing = Object.keys(lightShell).filter((k) => k.startsWith('--') && !NOT.has(k) && !(k in darkShell));
    expect(missing).toEqual([]);
  });
});

describe('contrast, light and dark', () => {
  const themes: [string, Record<string, string>][] = [['light', lightRoot], ['dark', darkRoot]];
  it.each(themes)('%s: text on the canvas, desks and cards is at least 4.5:1, hints 3:1', (_n, t) => {
    for (const surface of ['--pb-canvas', '--pb-desk', '--pb-card']) {
      for (const text of ['--t1', '--t2', '--pb-body']) expect(contrast(t[text], t[surface]), `${text} on ${surface}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t['--t3'], t[surface]), `--t3 on ${surface}`).toBeGreaterThanOrEqual(3);
    }
  });
  it.each(themes)('%s: text on the ink (buttons, chips, toasts) is at least 4.5:1, and the accent shows on a card', (_n, t) => {
    expect(contrast(t['--pb-on-ink'], t['--pb-ink'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t['--pb-edge-strong'], t['--pb-card'])).toBeGreaterThanOrEqual(3);
    expect(contrast(t['--pb-edge-strong'], t['--pb-canvas'])).toBeGreaterThanOrEqual(3);
  });
  it.each(themes)('%s: the stale pill text is readable', (_n, t) => {
    expect(contrast(t['--stale-fg'], t['--stale-bg'])).toBeGreaterThanOrEqual(4.5);
  });

  const tones = (css: string, prefix: string) => blocks(css).filter((b) => b.sel.startsWith(prefix) && /\.(f|tone)-\w+$/.test(b.sel));
  const lightTones = [...tones(pebble, ''), ...tones(colors, '')].filter((b) => /^\.pb-root \.(f|tone)-/.test(b.sel));
  const darkTones = tones(dark.slice(0, dark.indexOf('@media')), EXPLICIT);
  it.each([['light', lightTones], ['dark', darkTones]] as const)('%s: every family and card colour keeps 4.5:1 for its text, chip text and chat strip', (name, list) => {
    expect(list.length).toBe(15);
    const ink = name === 'light' ? lightRoot['--pb-ink'] : darkRoot['--pb-t1'] ?? darkRoot['--t1'];
    for (const b of list) {
      const d = b.decls;
      expect(contrast(d['--fx'], d['--fc']), `${b.sel} fx/fc`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(d['--fkt'], d['--fc']), `${b.sel} fkt/fc`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(d['--fkt'], d['--fk']), `${b.sel} fkt/fk`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink, d['--fc']), `${b.sel} ink/fc (a chat's tinted strip)`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('no light-only colours left in the board CSS', () => {
  const files = ['pebble.css', ...readdirSync(join(dir, 'chrome')).filter((f) => f.endsWith('.css') && f !== 'dark.css').map((f) => `chrome/${f}`)];
  // identity colours and fallbacks that read on both themes: the video hero (Claude orange), the red slash of "no colour", var() fallbacks, the tour's wire
  const ALLOWED = new Set(['#2C2C2E', '#E0673A', '#C0463F', '#F2B8B5', '#8FD0F5', '#000']);
  it('every hex outside a token definition is an allowed identity colour', () => {
    const found: string[] = [];
    for (const f of files) {
      for (const [i, line] of read(f).split('\n').entries()) {
        if (/^\.pb-root \.(f|tone)-\w+ \{/.test(line) || /^\s*--[\w-]+:/.test(line) || /^\.pb-root \{ --pb-canvas/.test(line)) continue;   // token and tone definitions
        for (const m of line.matchAll(/#[0-9A-Fa-f]{3,8}\b/g)) if (!ALLOWED.has(m[0].toUpperCase()) && !ALLOWED.has(m[0])) found.push(`${f}:${i + 1} ${m[0]}`);
      }
    }
    expect(found).toEqual([]);
  });
  it('no raw white or near-white fill is left either', () => {
    const found: string[] = [];
    for (const f of files) for (const [i, line] of read(f).split('\n').entries()) {
      if (/^\s*--[\w-]+:/.test(line) || /^\.pb-root \{ --pb-canvas/.test(line)) continue;
      if (/rgba\(255, ?255, ?255/.test(line)) found.push(`${f}:${i + 1}`);
    }
    expect(found).toEqual([]);
  });
});

describe('no light-only colours left in the shell CSS', () => {
  const shellFiles = ['home/home.css', 'landing/landing.css', 'signin/signin.css', 'settings/settings.css', 'account/account.css'];
  it('every hex outside a token definition is allowed', () => {
    const ALLOWED = new Set(['#F5F5F7']);   // the page behind the landing page (dark: chrome/dark.css)
    const found: string[] = [];
    for (const f of shellFiles) {
      for (const [i, line] of readFileSync(join('components/shell', f), 'utf8').split('\n').entries()) {
        for (const m of line.matchAll(/#[0-9A-Fa-f]{3,8}\b/g)) if (!ALLOWED.has(m[0].toUpperCase())) found.push(`${f}:${i + 1} ${m[0]}`);
      }
    }
    expect(found).toEqual([]);
  });
});
