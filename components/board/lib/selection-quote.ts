/** Turns what was selected in an answer into a Markdown block quote ("> ..." per line), for the notepad and for a new question. */
export function quoteOf(selected: string): string {
  return selected.replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).map((l) => `> ${l}`).join('\n');
}

/** A quote block ends with a blank line, so the cursor can go after it and the next thing typed is not part of the quote. */
export const quoteBlock = (selected: string): string => { const q = quoteOf(selected); return q ? `${q}\n\n` : ''; };

/** `block` appended to a note's text, one blank line after what is already there. */
export function appendBlock(text: string, block: string): string {
  if (!block) return text;
  if (!text) return block;
  const gap = text.endsWith('\n\n') ? '' : text.endsWith('\n') ? '\n' : '\n\n';
  return text + gap + block;
}
