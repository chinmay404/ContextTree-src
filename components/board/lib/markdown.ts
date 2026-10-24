import { esc } from './format';

/**
 * Reasoning blocks never reach the page (any case): whole blocks first, then everything before a lone closing tag
 * (a stream that started mid-thought), then an unterminated opening tail.
 */
const stripThink = (s: string): string => s
  .replace(/<think>[\s\S]*?<\/think>/gi, '')
  .replace(/^[\s\S]*<\/think>/i, '')
  .replace(/<think>[\s\S]*$/i, '');

const emph = (s: string): string => s
  .replace(/\*\*(?=\S)(.+?)\*\*/g, '<b>$1</b>')
  .replace(/\*(?=\S)(.+?)\*/g, '<i>$1</i>')
  .replace(/~~(?=\S)(.+?)~~/g, '<s>$1</s>');

/** Inline spans on ALREADY-ESCAPED text. Code and links are stashed so emphasis can't touch them. */
function inline(s: string): string {
  const stash: string[] = [];
  const keep = (h: string) => `\u0000${stash.push(h) - 1}\u0000`;
  let t = s.replace(/`([^`]+)`/g, (_m, c: string) => keep(`<code>${c}</code>`));
  t = t.replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g, (_m, label: string, url: string) =>
    keep(`<a href="${url}" target="_blank" rel="noopener noreferrer">${emph(label)}</a>`));
  t = emph(t);
  // Placeholders may nest (a code span inside a link label), so resolve until stable.
  for (let n = 0; n < 4 && t.includes('\u0000'); n++) t = t.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => stash[+i]);
  return t;
}

type Opts = { breaks?: boolean };

const FENCE = /^( *)(`{3,}|~{3,})\s*([^\s`]*)/;
const QUOTE = /^&gt;\s?(.*)$/;
const HEADING = /^#{1,6}\s+(.*)$/;
/** A table's delimiter row: `|:--|:-:|--:|`, outer pipes optional. */
const DELIM = /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?$/;

/** Cells of one table row on escaped text: outer pipes dropped, `\|` is a literal pipe. */
const cells = (line: string): string[] =>
  line.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));

const align = (d: string): string => {
  const l = d.startsWith(':'), r = d.endsWith(':');
  return l && r ? ' class="al-c"' : r ? ' class="al-r"' : l ? ' class="al-l"' : '';
};

/** Blocks from escaped lines: fenced code, tables, quotes, rules, headings, lists and paragraphs. */
function blocks(lines: string[], opts: Opts): string {
  const out: string[] = [];
  let list: 'ol' | 'ul' | null = null;
  let para: string[] = [];
  const flushPara = () => { if (para.length) out.push(`<p>${inline(para.join(opts.breaks ? '<br>' : ' '))}</p>`); para = []; };
  const closeList = () => { if (list) out.push(`</${list}>`); list = null; };
  const startsBlock = (l: string) => FENCE.test(l) || QUOTE.test(l.trim()) || HEADING.test(l.trim());
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    let m: RegExpMatchArray | null;
    if (!line) { flushPara(); closeList(); continue; }
    if ((m = raw.match(FENCE))) {
      // A stream can stop mid-block, so an unclosed fence runs to the end.
      flushPara(); closeList();
      const [, indent, fence, info] = m;
      const close = new RegExp(`^ *${fence[0] === '`' ? '`' : '~'}{${fence.length},}\\s*$`);
      const body: string[] = [];
      for (i++; i < lines.length && !close.test(lines[i]); i++) body.push(lines[i].replace(new RegExp(`^ {0,${indent.length}}`), ''));
      const lang = /^[\w+#.-]{1,24}$/.test(info) ? ` data-lang="${info}"` : '';
      out.push(`<pre class="md-code"${lang}><code>${body.join('\n')}</code></pre>`);
      continue;
    }
    if (QUOTE.test(line)) {
      flushPara(); closeList();
      const inner: string[] = [];
      for (; i < lines.length && (m = lines[i].trim().match(QUOTE)); i++) inner.push(m[1]);
      i--;
      out.push(`<blockquote>${blocks(inner, opts)}</blockquote>`);
      continue;
    }
    const next = lines[i + 1]?.trim() ?? '';
    if (line.includes('|') && next.includes('-') && DELIM.test(next) && cells(line).length === cells(next).length) {
      flushPara(); closeList();
      const al = cells(next).map(align);
      const row = (cs: string[], tag: 'th' | 'td') =>
        `<tr>${al.map((a, k) => `<${tag}${a}>${inline(cs[k] ?? '')}</${tag}>`).join('')}</tr>`;
      const body: string[] = [];
      for (i += 2; i < lines.length && lines[i].trim() && !startsBlock(lines[i]); i++) body.push(row(cells(lines[i]), 'td'));
      i--;
      out.push(`<div class="md-tw"><table><thead>${row(cells(line), 'th')}</thead><tbody>${body.join('')}</tbody></table></div>`);
      continue;
    }
    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(line)) { flushPara(); closeList(); out.push('<hr>'); continue; }
    if ((m = line.match(HEADING))) { flushPara(); closeList(); out.push(`<h3>${inline(m[1])}</h3>`); continue; }
    const kind: 'ol' | 'ul' | null = (m = line.match(/^\d+\.\s+(.*)$/)) ? 'ol' : (m = line.match(/^[-*]\s+(.*)$/)) ? 'ul' : null;
    if (kind && m) {
      flushPara();
      if (list !== kind) { closeList(); out.push(`<${kind}>`); list = kind; }
      out.push(`<li>${inline(m[1])}</li>`);
      continue;
    }
    closeList();
    para.push(line);
  }
  flushPara();
  closeList();
  return out.join('');
}

/**
 * Safe markdown subset to HTML for innerHTML: <think> removed, everything escaped, then rendered.
 * No raw HTML passes through; links are http(s)/mailto only. All heading levels render as <h3>.
 */
export function renderMarkdown(md: string, opts: Opts = {}): string {
  const text = esc(stripThink(String(md ?? '')).replace(/\u0000/g, '')).replace(/\r\n?/g, '\n');
  return blocks(text.split('\n'), opts);
}
