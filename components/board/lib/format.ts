const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

/** HTML-escape a value before it goes into innerHTML. */
export const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"]/g, (c) => ESC[c]);

/** Clip to n characters with an ellipsis. */
export const cut = (s: unknown, n: number): string => {
  const t = String(s || '');
  return t.length > n ? t.slice(0, n - 1).trim() + '…' : t;
};

export const sizeOf = (b: number): string =>
  b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' KB';
