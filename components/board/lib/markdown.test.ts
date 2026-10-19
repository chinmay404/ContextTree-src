import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('renders the seed answer shape', () => {
    expect(renderMarkdown('### So\n1. **Free** with your own key.\n2. Two')).toBe(
      '<h3>So</h3><ol><li><b>Free</b> with your own key.</li><li>Two</li></ol>',
    );
  });
  it('escapes html', () => {
    expect(renderMarkdown('<img src=x onerror=alert(1)>')).toBe('<p>&lt;img src=x onerror=alert(1)&gt;</p>');
  });
  it('drops think blocks, even unterminated', () => {
    expect(renderMarkdown('<think>a</think>Hi')).toBe('<p>Hi</p>');
    expect(renderMarkdown('Hi<think>half')).toBe('<p>Hi</p>');
  });
  it('strips think blocks before escaping (multi-line, multiple)', () => {
    expect(renderMarkdown('<think>a\nb</think>One<think>c</think> two')).toBe('<p>One two</p>');
  });
  it('strips think tags in any case', () => {
    expect(renderMarkdown('<THINK>a</Think>Hi')).toBe('<p>Hi</p>');
    expect(renderMarkdown('Hi<Think>half')).toBe('<p>Hi</p>');
  });
  it('drops everything before a lone closing think tag', () => {
    expect(renderMarkdown('reasoning here\n</think>\nAnswer')).toBe('<p>Answer</p>');
    expect(renderMarkdown('x</THINK>Answer')).toBe('<p>Answer</p>');
  });
  it('only http(s) and mailto links', () => {
    expect(renderMarkdown('[x](javascript:alert(1))')).not.toContain('href');
    expect(renderMarkdown('[x](data:text/html,hi)')).not.toContain('href');
    expect(renderMarkdown('[x](https://a.com/p?q=1&r=2)')).toBe(
      '<p><a href="https://a.com/p?q=1&amp;r=2" target="_blank" rel="noopener noreferrer">x</a></p>',
    );
    expect(renderMarkdown('[m](mailto:a@b.co)')).toContain('href="mailto:a@b.co"');
  });
  it('cannot break out of the href attribute', () => {
    const h = renderMarkdown('[x](https://a.com/"onmouseover="alert(1))');
    expect(h).not.toMatch(/"onmouseover=/);
  });
  it('supports bullets, italics, code and all heading levels as h3', () => {
    expect(renderMarkdown('###### T\n- a\n* b\n\nsome *it* and `c<d`')).toBe(
      '<h3>T</h3><ul><li>a</li><li>b</li></ul><p>some <i>it</i> and <code>c&lt;d</code></p>',
    );
  });
  it('handles empty input', () => {
    expect(renderMarkdown('')).toBe('');
  });
});
