/** The palette a card can be coloured from (owner, 2026-10-21): eight muted Apple-like tones, plus Default (no tint).
 *  Stored as `data.color` (a key below; absent or null = default). The tones' tokens live in chrome/colors.css as
 *  `.tone-<key>`, the same five tokens a source family sets (--fc card, --fd deep, --fk chip, --fkt chip text, --fx text). */
export const CARD_COLORS = ['graphite', 'blue', 'teal', 'green', 'yellow', 'orange', 'red', 'pink'] as const;
export type CardColor = (typeof CARD_COLORS)[number];

export const COLOR_LABEL: Record<CardColor, string> = {
  graphite: 'Graphite', blue: 'Blue', teal: 'Teal', green: 'Green', yellow: 'Yellow', orange: 'Orange', red: 'Red', pink: 'Pink',
};
/** The swatch dot: each tone's deep colour. */
export const COLOR_SWATCH: Record<CardColor, string> = {
  graphite: '#6E6E73', blue: '#3A78B8', teal: '#2F8F8F', green: '#4F8A45', yellow: '#B58B12', orange: '#C26A1B', red: '#C0463F', pink: '#C0568A',
};

export function isCardColor(v: unknown): v is CardColor {
  return typeof v === 'string' && (CARD_COLORS as readonly string[]).includes(v);
}

/** The card's colour, or null for default (also for a key this build does not know). */
export function colorOf(data: { color?: unknown } | null | undefined): CardColor | null {
  return isCardColor(data?.color) ? data!.color as CardColor : null;
}
