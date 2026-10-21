import { readFileSync } from 'node:fs';

const css = readFileSync('components/board/chrome/materials.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

describe('materials.css', () => {
  it('defines the glass recipe and a hairline', () => {
    expect(css).toContain('--glass-bg: rgba(255,255,255,.62)');
    expect(css).toContain('backdrop-filter: blur(30px) saturate(180%)');
    expect(css).toContain('-webkit-backdrop-filter: blur(30px) saturate(180%)');
    expect(css).toContain('--hairline: rgba(0,0,0,.08)');
  });
  it('falls back to solid white without transparency or backdrop-filter support', () => {
    expect(css).toMatch(/@media \(prefers-reduced-transparency: reduce\)\s*\{[^@]*background: var\(--glass-solid\)/);
    expect(css).toMatch(/@supports not \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\)\s*\{[^@]*background: var\(--glass-solid\)/);
    expect(css).toContain('--glass-solid: #FFFFFF');
  });
  it('has the two-layer card shadow and the radius tokens', () => {
    expect(css).toContain('--sh-card: 0 1px 2px rgba(0,0,0,.06), 0 8px 28px rgba(0,0,0,.08)');
    expect(css).toContain('--sh-node: 0 1px 2px rgba(0,0,0,.06), 0 8px 28px rgba(0,0,0,.08)');
    for (const t of ['--r-tile: 10px', '--r-row: 14px', '--r-card: 18px', '--r-sheet: 26px']) expect(css).toContain(t);
  });
  it('uses no coloured shadows', () => {
    for (const m of css.matchAll(/rgba\((\d+),\s*(\d+),\s*(\d+)/g)) expect([m[1], m[2], m[3]].join()).toMatch(/^(0,0,0|255,255,255)$/);
  });
});
