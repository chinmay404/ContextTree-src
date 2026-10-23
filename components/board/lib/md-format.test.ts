import { applyFormat, type Edit } from './md-format';
import { renderMarkdown } from './markdown';

const sel = (value: string, a: string, kind: Parameters<typeof applyFormat>[3], within = a): Edit => {
  const i = value.indexOf(within);
  return applyFormat(value, i, i + within.length, kind);
};
const text = (e: Edit): string => e.value.slice(e.start, e.end);

describe('applyFormat: inline marks', () => {
  it('wraps the selection and keeps it selected', () => {
    const e = sel('say hello now', 'hello', 'bold');
    expect(e.value).toBe('say **hello** now');
    expect(text(e)).toBe('hello');
    expect(sel('say hello now', 'hello', 'italic').value).toBe('say *hello* now');
    expect(sel('say hello now', 'hello', 'code').value).toBe('say `hello` now');
  });
  it('toggles off when the selection is already wrapped, inside or around it', () => {
    expect(sel('say **hello** now', 'hello', 'bold').value).toBe('say hello now');
    expect(sel('say **hello** now', '**hello**', 'bold').value).toBe('say hello now');
    expect(sel('say *hello* now', 'hello', 'italic').value).toBe('say hello now');
    expect(sel('say `hello` now', 'hello', 'code').value).toBe('say hello now');
  });
  it('italic does not mistake bold for italic', () => {
    expect(sel('say **hello** now', 'hello', 'italic').value).toBe('say ***hello*** now');
  });
  it('an empty selection inserts the marks around the caret', () => {
    const e = applyFormat('ab', 1, 1, 'bold');
    expect(e.value).toBe('a****b');
    expect([e.start, e.end]).toEqual([3, 3]);
  });
  it('a link wraps the text and selects the address to type over', () => {
    const e = sel('see the docs here', 'the docs', 'link');
    expect(e.value).toBe('see [the docs](https://) here');
    expect(text(e)).toBe('https://');
    const bare = applyFormat('x', 0, 0, 'link');
    expect(bare.value).toBe('[link text](https://)x');
    expect(text(bare)).toBe('link text');
  });
});

describe('applyFormat: line marks', () => {
  const lines = 'one\ntwo\nthree';
  it('a heading prefixes every selected line, and toggles off', () => {
    expect(applyFormat(lines, 0, 7, 'heading').value).toBe('# one\n# two\nthree');
    expect(applyFormat('# one\n# two\nthree', 0, 11, 'heading').value).toBe('one\ntwo\nthree');
  });
  it('a bullet list prefixes the lines; a second press removes it', () => {
    const e = applyFormat(lines, 0, lines.length, 'bullet');
    expect(e.value).toBe('- one\n- two\n- three');
    expect(applyFormat(e.value, e.start, e.end, 'bullet').value).toBe(lines);
  });
  it('a numbered list counts the lines; other list marks are replaced', () => {
    const e = applyFormat(lines, 0, lines.length, 'number');
    expect(e.value).toBe('1. one\n2. two\n3. three');
    expect(applyFormat('- one\n- two', 0, 11, 'number').value).toBe('1. one\n2. two');
    expect(applyFormat(e.value, e.start, e.end, 'number').value).toBe(lines);
  });
  it('only the lines the selection touches change', () => {
    expect(applyFormat(lines, 5, 6, 'bullet').value).toBe('one\n- two\nthree');
    expect(applyFormat(lines, 4, 4, 'heading').value).toBe('one\n# two\nthree');
  });
});

describe('what the formatting renders to', () => {
  it('bold, italic, code, link, heading and both lists', () => {
    const html = renderMarkdown('# Title\n**b** *i* `c` [x](https://example.com)\n\n- a\n- b\n\n1. one\n2. two', { breaks: true });
    expect(html).toContain('<h3>Title</h3>');
    expect(html).toContain('<b>b</b>');
    expect(html).toContain('<i>i</i>');
    expect(html).toContain('<code>c</code>');
    expect(html).toContain('<a href="https://example.com" target="_blank" rel="noopener noreferrer">x</a>');
    expect(html).toContain('<ul><li>a</li><li>b</li></ul>');
    expect(html).toContain('<ol><li>one</li><li>two</li></ol>');
  });
  it('a plain note keeps its line breaks when breaks is on', () => {
    expect(renderMarkdown('line one\nline two', { breaks: true })).toBe('<p>line one<br>line two</p>');
    expect(renderMarkdown('line one\nline two')).toBe('<p>line one line two</p>');   // answers still join soft-wrapped lines
  });
  it('raw HTML and script links are text, never markup', () => {
    const html = renderMarkdown('<img src=x onerror=alert(1)> [x](javascript:alert(1)) <script>alert(1)</script>', { breaks: true });
    expect(html).not.toContain('<img'); expect(html).not.toContain('<script'); expect(html).not.toContain('href="javascript');
    expect(html).toContain('&lt;img');
  });
});
