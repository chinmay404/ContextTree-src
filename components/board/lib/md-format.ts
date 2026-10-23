/**
 * Light Markdown formatting for notes (P15): pure edits on a text and its selection, used by the floating toolbar and by
 * Ctrl/Cmd+B, I and K. A note is stored as Markdown in its text and drawn with lib/markdown.ts, so nothing here needs the engine.
 */
export type FormatKind = 'bold' | 'italic' | 'code' | 'link' | 'heading' | 'bullet' | 'number';
export interface Edit { value: string; start: number; end: number }

const run = (value: string, from: number, dir: 1 | -1, ch: string): number => {
  let n = 0;
  for (let i = dir > 0 ? from : from - 1; i >= 0 && i < value.length && value[i] === ch; i += dir) n++;
  return n;
};

/** Wraps the selection in `m`, or takes the marks off when it is already wrapped (inside the selection or just around it). */
function wrap(value: string, start: number, end: number, m: '**' | '*' | '`'): Edit {
  const ch = m[0], len = m.length;
  const sel = value.slice(start, end);
  if (ch === '`') {
    if (sel.length > 2 && sel.startsWith('`') && sel.endsWith('`')) return { value: value.slice(0, start) + sel.slice(1, -1) + value.slice(end), start, end: end - 2 };
    if (value[start - 1] === '`' && value[end] === '`') return { value: value.slice(0, start - 1) + sel + value.slice(end + 1), start: start - 1, end: end - 1 };
  } else {
    // bold is a run of at least two stars on each side, italic an odd run (so "***x***" is both)
    const has = (b: number, a: number) => (len === 2 ? b >= 2 && a >= 2 : b % 2 === 1 && a % 2 === 1);
    const inB = run(sel, 0, 1, '*'), inA = run(sel, sel.length, -1, '*');
    if (sel.length > 2 * len && has(inB, inA) && inB < sel.length) {
      return { value: value.slice(0, start) + sel.slice(len, sel.length - len) + value.slice(end), start, end: end - 2 * len };
    }
    const b = run(value, start, -1, '*'), a = run(value, end, 1, '*');
    if (has(b, a)) return { value: value.slice(0, start - len) + sel + value.slice(end + len), start: start - len, end: end - len };
  }
  return { value: value.slice(0, start) + m + sel + m + value.slice(end), start: start + len, end: end + len };
}

function link(value: string, start: number, end: number): Edit {
  const text = value.slice(start, end) || 'link text';
  const out = value.slice(0, start) + `[${text}](https://)` + value.slice(end);
  if (start === end) return { value: out, start: start + 1, end: start + 1 + text.length };   // select the placeholder text
  const urlStart = start + text.length + 3;
  return { value: out, start: urlStart, end: urlStart + 'https://'.length };                 // select the address to type over
}

const ANY_PREFIX = /^(#{1,6}\s+|[-*]\s+|\d+\.\s+)/;
const PREFIX: Record<'heading' | 'bullet' | 'number', RegExp> = { heading: /^#{1,6}\s+/, bullet: /^[-*]\s+/, number: /^\d+\.\s+/ };

function lines(value: string, start: number, end: number, kind: 'heading' | 'bullet' | 'number'): Edit {
  const ls = value.lastIndexOf('\n', start - 1) + 1;
  const last = end > start ? end - 1 : end;
  const nl = value.indexOf('\n', last);
  const le = nl === -1 ? value.length : nl;
  const rows = value.slice(ls, le).split('\n');
  const filled = rows.filter((r) => r.trim());
  const off = filled.length > 0 && filled.every((r) => PREFIX[kind].test(r));   // all already marked: a second press clears them
  let n = 0;
  const next = rows.map((r) => {
    if (!r.trim()) return r;
    const bare = r.replace(ANY_PREFIX, '');
    if (off) return bare;
    n++;
    return (kind === 'heading' ? '# ' : kind === 'bullet' ? '- ' : `${n}. `) + bare;
  });
  const joined = next.join('\n');
  return { value: value.slice(0, ls) + joined + value.slice(le), start: ls, end: ls + joined.length };
}

export function applyFormat(value: string, start: number, end: number, kind: FormatKind): Edit {
  const a = Math.max(0, Math.min(start, end)), b = Math.min(value.length, Math.max(start, end));
  switch (kind) {
    case 'bold': return wrap(value, a, b, '**');
    case 'italic': return wrap(value, a, b, '*');
    case 'code': return wrap(value, a, b, '`');
    case 'link': return link(value, a, b);
    default: return lines(value, a, b, kind);
  }
}
