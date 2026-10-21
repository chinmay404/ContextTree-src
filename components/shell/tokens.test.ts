import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (rel: string) => readFileSync(path.resolve(__dirname, rel), 'utf8');
const pebble = read('../board/pebble.css');
const materials = read('../board/chrome/materials.css');
const shell = read('./tokens.css');

const val = (css: string, name: string): string | null => {
  const m = new RegExp(`${name}:\\s*([^;]+);`).exec(css);
  return m ? m[1].trim() : null;
};

describe('shell tokens match the board', () => {
  it.each(['--pb-canvas', '--pb-desk', '--pb-card', '--pb-fill', '--pb-edge', '--pb-ink', '--t1', '--t2', '--t3', '--ready', '--stale', '--failed'])(
    '%s equals pebble.css',
    (name) => {
      expect(val(shell, name)).not.toBeNull();
      expect(val(shell, name)).toBe(val(pebble, name));
    },
  );

  it('--pb-accent equals the board edge-strong blue', () => {
    expect(val(shell, '--pb-accent')).toBe(val(pebble, '--pb-edge-strong'));
  });

  it.each(['--hairline', '--hairline-strong', '--glass-bg', '--glass-solid', '--sh-card', '--r-tile', '--r-row', '--r-card', '--r-sheet'])(
    '%s equals materials.css',
    (name) => {
      expect(val(shell, name)).not.toBeNull();
      expect(val(shell, name)).toBe(val(materials, name));
    },
  );

  it('has no purple left', () => {
    expect(shell).not.toMatch(/#(EDE8F5|CFC3E8|F5F2FA|2B2340)/i);
  });

  it('scopes buttons and menus under .ct-shell', () => {
    expect(shell).toMatch(/\.ct-shell \.btn\.primary/);
    expect(shell).toMatch(/\.ct-shell \.menu \.mi/);
  });
});
