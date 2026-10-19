const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** HTML-escape a value before it goes into innerHTML. */
export const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

/** Clip to n characters with an ellipsis. */
export const cut = (s: unknown, n: number): string => {
  const t = String(s || '');
  return t.length > n ? t.slice(0, n - 1).trim() + '…' : t;
};

export const sizeOf = (b: number): string =>
  b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' KB';

/** Plain text of an HTML fragment. */
export const strip = (h: unknown): string => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/** `Mon 10:12`: short weekday plus local HH:MM. Empty for an unparseable date. */
export const formatWhen = (iso: string, _now: Date = new Date()): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${hh}:${mm}`;
};
