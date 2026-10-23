import { readFileSync } from 'node:fs';

const css = readFileSync('components/board/pebble.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** Selector lists of every rule, skipping @keyframes bodies; descends into @media. */
function selectorLists(src: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < src.length) {
    const open = src.indexOf('{', i);
    if (open < 0) break;
    const head = src.slice(i, open).trim();
    let depth = 1, j = open + 1;
    while (j < src.length && depth) { if (src[j] === '{') depth++; else if (src[j] === '}') depth--; j++; }
    const body = src.slice(open + 1, j - 1);
    if (head.startsWith('@keyframes')) { /* skip */ }
    else if (head.startsWith('@media')) out.push(...selectorLists(body));
    else out.push(head);
    i = j;
  }
  return out;
}

describe('pebble.css', () => {
  it('keeps the prototype tokens', () => {
    expect(css).toContain('--pb-canvas: #F5F5F7');
    expect(css).toContain('--pb-ink: #1D1D1F');
  });
  it('scopes every rule under .pb-root', () => {
    const lists = selectorLists(css);
    expect(lists.length).toBeGreaterThan(200);
    for (const l of lists) for (const s of l.split(',')) expect(s.trim(), s).toMatch(/^\.pb-root\b/);
  });
  it('has no id selectors or html/body', () => {
    for (const l of selectorLists(css)) expect(l).not.toContain('#');
    for (const l of selectorLists(css)) expect(l).not.toMatch(/(^|,)\s*(html|body)/);
  });
  it('has no blanket reduced-motion override', () => {
    expect(css).not.toMatch(/prefers-reduced-motion[^{]*\{\s*\*/);
    expect(css).toMatch(/prefers-reduced-motion: reduce/);
  });
  it('uses the next/font variable', () => {
    expect(css).toContain('var(--pb-font)');
  });
  it('defines the V3 rules', () => {
    for (const s of ['.soon-pill', '.dots i.soon', '.card.demoted', '.pb-toast', '.pb-confirm', '.err', '.soonbox']) expect(css).toContain(s);
  });
  it('caps a long note so the card and its port stay in reach', () => {
    expect(css).toMatch(/\.note-in \.n \{[^}]*max-height: 240px[^}]*overflow: auto/);
  });
});
