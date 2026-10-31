/**
 * A note's text: its name (the first line), what the engine reads of it, and how an edited note's DOM becomes text again.
 * A note is edited as plain text in a `white-space: pre-wrap` editable, so a new line is a "\n" in a text node. Browsers
 * may still write <br> or <div> lines into it (Enter in a rich editable, a drop, an extension); editableText reads those
 * back as new lines, so no line is lost whatever the browser did.
 */
import { cut } from './format';

/** The engine reads the first 4000 characters of a note (ContextTree app/agent/reads.py NOTE_MAX_CHARS). */
export const NOTE_MAX_CHARS = 4000;

/** New lines as a note keeps them: a Windows clipboard ends its lines with \r\n. */
export const plainLines = (text: string): string => text.replace(/\r\n?/g, '\n');

/** Inline Markdown marks off a line, kept as text when they are not marks: snake_case and 2 * 3 stay as they are. */
const plainInline = (s: string): string => s
  .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/`([^`]*)`/g, '$1')
  .replace(/(^|[^\w*])\*\*(?=\S)(.+?)(?<=\S)\*\*(?![\w*])/g, '$1$2')
  .replace(/(^|[^\w_])__(?=\S)(.+?)(?<=\S)__(?![\w_])/g, '$1$2')
  .replace(/~~(?=\S)(.+?)(?<=\S)~~/g, '$1')
  .replace(/(^|[^\w*])\*(?=\S)([^*]+?)(?<=\S)\*(?![\w*])/g, '$1$2')
  .replace(/(^|[^\w_])_(?=\S)([^_]+?)(?<=\S)_(?![\w_])/g, '$1$2');

/** A note's name: its first line with words in it, without Markdown marks, clipped to `n` like any name. */
export function noteTitle(text: string, n = 34): string {
  for (const raw of text.split('\n')) {
    const line = plainInline(raw.replace(/^\s*(#{1,6}(\s+|$)|>\s*|[-*+]\s+(\[[ xX]\]\s+)?|\d+[.)]\s+)*/, '')).trim();   // heading, quote, list and task marks
    if (line) return cut(line, n);
  }
  return '';
}

/** The words after a note's name, on one line: what a pile's face shows beneath it. */
export function noteRest(text: string): string {
  const lines = text.split('\n');
  const first = lines.findIndex((l) => noteTitle(l));
  return first < 0 ? '' : lines.slice(first + 1).map((l) => noteTitle(l, Infinity)).filter(Boolean).join(' ');
}

const BLOCK = /^(DIV|P|LI|H[1-6]|BLOCKQUOTE|PRE|UL|OL|TR|SECTION|ARTICLE)$/;

/**
 * The text an edited note holds: text nodes as they are, a <br> as a new line, and each block element that follows
 * other text starts a new line. The <br> a browser leaves at the end of a block (or of the note) only holds the line
 * open and adds nothing. `whole: false` reads a prefix (up to a caret), where a trailing <br> does count.
 */
export function editableText(root: Node, whole = true): string {
  let out = '';
  let fresh = false;    // the line being written is new and still empty, so a block may use it
  let tailBr = false;   // the last thing written is a <br>'s new line
  let after = false;    // a block just ended: inline text that follows starts a new line
  const write = (s: string): void => { out += s; fresh = s.endsWith('\n'); };
  const lead = (): void => { if (after && out && !fresh) write('\n'); after = false; };
  const visit = (n: Node, top: boolean): void => {
    if (n.nodeType === 3) { const t = (n as Text).data; if (t) { lead(); write(t); tailBr = false; } return; }
    if (n.nodeType !== 1 && n.nodeType !== 11) return;
    const el = n as Element;
    if (n.nodeType === 1 && el.tagName === 'BR') { lead(); write('\n'); tailBr = true; return; }
    const block = !top && n.nodeType === 1 && BLOCK.test(el.tagName);
    if (block) { after = false; tailBr = false; if (out && !fresh) write('\n'); }
    n.childNodes.forEach((c) => visit(c, false));
    if (block) {
      if (tailBr) out = out.slice(0, -1);
      tailBr = false; fresh = false; after = true;   // the block's line is done, even when it was empty
    } else if (top && whole && tailBr) out = out.slice(0, -1);
  };
  visit(root, true);
  return out.replace(/ /g, ' ');
}

/** A DOM position inside `root` (a caret or a selection end) as an index into editableText(root). */
export function editableOffset(root: Node, node: Node, offset: number): number {
  const r = (root.ownerDocument ?? document).createRange();
  r.selectNodeContents(root);
  r.setEnd(node, offset);
  return editableText(r.cloneContents(), false).length;
}

/** Puts a caret (or a selection) at text indices of a note that holds one text node. */
export function selectText(root: HTMLElement, start: number, end = start): void {
  const t = root.firstChild;
  const sel = root.ownerDocument.getSelection();
  if (!sel) return;
  const r = root.ownerDocument.createRange();
  if (t && t.nodeType === 3) {
    const L = (t as Text).length;
    r.setStart(t, Math.min(start, L)); r.setEnd(t, Math.min(end, L));
  } else { r.selectNodeContents(root); r.collapse(false); }
  sel.removeAllRanges(); sel.addRange(r);
}

/**
 * A paste: `text` replaces the selection in `root` (or goes at the end when the caret is elsewhere), its new lines kept,
 * and the caret lands after it. The note is then one text node again, so nothing the browser wrote into it is lost.
 * Returns the note's new text.
 */
export function insertPlain(root: HTMLElement, text: string): string {
  const doc = root.ownerDocument, sel = doc.getSelection();
  const value = editableText(root);
  let start = value.length, end = value.length;
  if (sel && sel.rangeCount && root.contains(sel.anchorNode) && root.contains(sel.focusNode)) {
    const a = editableOffset(root, sel.anchorNode!, sel.anchorOffset), b = editableOffset(root, sel.focusNode!, sel.focusOffset);
    start = Math.min(a, b); end = Math.max(a, b);
  }
  const paste = plainLines(text);
  const next = value.slice(0, start) + paste + value.slice(end);
  root.textContent = next;
  selectText(root, start + paste.length);
  return next;
}
