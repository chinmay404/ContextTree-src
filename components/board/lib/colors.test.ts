import { readFileSync } from 'node:fs';
import { CARD_COLORS, COLOR_LABEL, COLOR_SWATCH, colorOf, isCardColor } from './colors';
import { contrast } from './contrast';

const css = readFileSync('components/board/chrome/colors.css', 'utf8');
const tones = [...css.matchAll(/\.pb-root \.tone-(\w+) \{([^}]*)\}/g)];
const tok = (body: string, k: string) => body.match(new RegExp(`--${k}: (#[0-9A-Fa-f]{6})`))![1];

describe('card colours', () => {
  it('are eight tones plus default, and no purple', () => {
    expect([...CARD_COLORS]).toEqual(['graphite', 'blue', 'teal', 'green', 'yellow', 'orange', 'red', 'pink']);
    expect(Object.keys(COLOR_LABEL).sort()).toEqual([...CARD_COLORS].sort());
    expect(Object.keys(COLOR_SWATCH).sort()).toEqual([...CARD_COLORS].sort());
    expect(CARD_COLORS).not.toContain('purple' as never);
  });

  it('every tone is defined in colors.css, and nothing else is', () => {
    expect(tones.map((m) => m[1]).sort()).toEqual([...CARD_COLORS].sort());
    for (const [, name, body] of tones) expect(tok(body, 'fd'), name).toBe(COLOR_SWATCH[name as keyof typeof COLOR_SWATCH]);
  });

  it('keeps text contrast >= 4.5:1 on every tone (card text, chip text on the card and on its chip)', () => {
    for (const [, name, body] of tones) {
      const [fc, fk, fkt, fx] = ['fc', 'fk', 'fkt', 'fx'].map((k) => tok(body, k));
      expect(contrast(fx, fc), `${name} fx/fc`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(fkt, fc), `${name} fkt/fc`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(fkt, fk), `${name} fkt/fk`).toBeGreaterThanOrEqual(4.5);
      expect(contrast('#1D1D1F', fc), `${name} ink/fc (chat strip)`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('colorOf reads a key, and anything else is default', () => {
    expect(colorOf({ color: 'blue' })).toBe('blue');
    expect(colorOf({ color: null })).toBeNull();
    expect(colorOf({ color: 'purple' })).toBeNull();
    expect(colorOf({})).toBeNull();
    expect(colorOf(undefined)).toBeNull();
    expect(isCardColor('pink')).toBe(true);
  });
});
