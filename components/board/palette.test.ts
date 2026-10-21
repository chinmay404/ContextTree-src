import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const OLD = ['#3B3352', '#DDD3EE', '#D6CDE6', '#E4DCF2', '#3A2B55', '#EDE8F5', '#F5F2FA', '#EFE9F8', '#CFC3E8', '#A594D1', '#2B2340',
  '#6E6585', '#9A92AD', '#7A52D6', '#E6DBFF', '#B9A0F5', '#4F3A8A'];

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(css|ts|tsx)$/.test(n)) out.push(p);
  }
  return out;
}

const css = readFileSync('components/board/pebble.css', 'utf8');

function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrast(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

describe('Apple-grey palette', () => {
  it('leaves no old purple hex or --pb-lilac in board code', () => {
    const files = walk('components/board').filter((f) => !/catalog\.ts$/.test(f) && !/palette\.test\.ts$/.test(f) && !/\.test\.ts$/.test(f));
    expect(files.length).toBeGreaterThan(20);
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      for (const h of OLD) expect(src.toUpperCase(), `${f} ${h}`).not.toContain(h);
      expect(src, f).not.toMatch(/--pb-lilac|rgba\(245, ?242, ?250/);
    }
  });
  it('defines the neutral tokens', () => {
    for (const t of ['--pb-canvas: #F5F5F7', '--pb-desk: #EBEBF0', '--pb-fill: #F2F2F5', '--pb-edge: #D2D2D7', '--pb-edge-strong: #0071E3',
      '--pb-ink: #1D1D1F', '--t1: #1D1D1F', '--t2: #6E6E73', '--t3: #86868B']) expect(css).toContain(t);
  });
  it('family colours keep text contrast >= 4.5:1', () => {
    const fams = [...css.matchAll(/\.pb-root \.f-(\w+) \{([^}]*)\}/g)];
    expect(fams.map((m) => m[1]).sort()).toEqual(['data', 'docs', 'image', 'media', 'mixed', 'note', 'web']);
    const rows: string[] = [];
    for (const [, name, body] of fams) {
      const v = (k: string) => body.match(new RegExp(`--${k}: (#[0-9A-Fa-f]{6})`))![1];
      rows.push(`${name}: fx/fc ${contrast(v('fx'), v('fc')).toFixed(2)}, fkt/fc ${contrast(v('fkt'), v('fc')).toFixed(2)}, fkt/fk ${contrast(v('fkt'), v('fk')).toFixed(2)}`);
      expect(contrast(v('fx'), v('fc')), `${name} fx/fc`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(v('fkt'), v('fc')), `${name} fkt/fc`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(v('fkt'), v('fk')), `${name} fkt/fk`).toBeGreaterThanOrEqual(4.5);
    }
    console.info(`CONTRAST ${rows.join(' | ')}`);
  });
});
