import { esc } from './format';

/**
 * Reasoning blocks never reach the page (any case): whole blocks first, then everything before a lone closing tag
 * (a stream that started mid-thought), then an unterminated opening tail.
 */
const stripThink = (s: string): string => s
  .replace(/<think>[\s\S]*?<\/think>/gi, '')
  .replace(/^[\s\S]*<\/think>/i, '')
  .replace(/<think>[\s\S]*$/i, '');

const emph = (s: string): string =>
  s.replace(/\*\*(?=\S)(.+?)\*\*/g, '<b>$1</b>').replace(/\*(?=\S)(.+?)\*/g, '<i>$1</i>');

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

/**
 * Safe markdown subset to HTML for innerHTML: <think> removed, everything escaped, then rendered.
 * No raw HTML passes through; links are http(s)/mailto only. All heading levels render as <h3>.
 */
export function renderMarkdown(md: string, opts: { breaks?: boolean } = {}): string {
  const text = esc(stripThink(String(md ?? '')).replace(/\u0000/g, '')).replace(/\r\n?/g, '\n');
  const out: string[] = [];
  let list: 'ol' | 'ul' | null = null;
  let para: string[] = [];
  const flushPara = () => { if (para.length) out.push(`<p>${inline(para.join(opts.breaks ? '<br>' : ' '))}</p>`); para = []; };
  const closeList = () => { if (list) out.push(`</${list}>`); list = null; };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    let m: RegExpMatchArray | null;
    if (!line) { flushPara(); closeList(); continue; }
    if ((m = line.match(/^#{1,6}\s+(.*)$/))) { flushPara(); closeList(); out.push(`<h3>${inline(m[1])}</h3>`); continue; }
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
