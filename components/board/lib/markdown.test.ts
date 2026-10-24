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

  describe('code blocks', () => {
    it('renders a fenced block with its language, keeping lines and indentation, nothing inline inside', () => {
      expect(renderMarkdown('Run:\n```bash\ndocker run \\\n  -t **x** `y` <z>\n```\nDone')).toBe(
        '<p>Run:</p><pre class="md-code" data-lang="bash"><code>docker run \\\n  -t **x** `y` &lt;z&gt;</code></pre><p>Done</p>',
      );
    });
    it('takes ~~~ fences and no language', () => {
      expect(renderMarkdown('~~~\na\n~~~')).toBe('<pre class="md-code"><code>a</code></pre>');
    });
    it('keeps blank lines inside the block', () => {
      expect(renderMarkdown('```\na\n\nb\n```')).toBe('<pre class="md-code"><code>a\n\nb</code></pre>');
    });
    it('an unclosed fence (a stream mid-block) runs to the end', () => {
      expect(renderMarkdown('```py\nx = 1')).toBe('<pre class="md-code" data-lang="py"><code>x = 1</code></pre>');
    });
    it('a language that is not a plain word is dropped', () => {
      expect(renderMarkdown('```"onclick=alert(1)\nx\n```')).toBe('<pre class="md-code"><code>x</code></pre>');
    });
    it('strips the fence indent from a block inside a list item', () => {
      expect(renderMarkdown('- a\n  ```\n  b\n    c\n  ```')).toBe('<ul><li>a</li></ul><pre class="md-code"><code>b\n  c</code></pre>');
    });
  });

  describe('tables', () => {
    it('renders a GFM table with a header, alignment and inline spans in cells', () => {
      expect(renderMarkdown('| Parameter | Example | Does |\n|:--|:-:|--:|\n| `-t` | **x** | a \\| b |')).toBe(
        '<div class="md-tw"><table><thead><tr><th class="al-l">Parameter</th><th class="al-c">Example</th><th class="al-r">Does</th></tr></thead>' +
        '<tbody><tr><td class="al-l"><code>-t</code></td><td class="al-c"><b>x</b></td><td class="al-r">a | b</td></tr></tbody></table></div>',
      );
    });
    it('works without the outer pipes, pads short rows and cuts long ones', () => {
      expect(renderMarkdown('a | b\n--- | ---\n1\n1 | 2 | 3')).toBe(
        '<div class="md-tw"><table><thead><tr><th>a</th><th>b</th></tr></thead>' +
        '<tbody><tr><td>1</td><td></td></tr><tr><td>1</td><td>2</td></tr></tbody></table></div>',
      );
    });
    it('ends at a blank line and needs the delimiter row', () => {
      expect(renderMarkdown('| a |\n|---|\n| 1 |\n\nafter')).toBe(
        '<div class="md-tw"><table><thead><tr><th>a</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table></div><p>after</p>',
      );
      expect(renderMarkdown('a | b\nc | d')).toBe('<p>a | b c | d</p>');
    });
    it('a header with no body rows yet (streaming) still renders', () => {
      expect(renderMarkdown('| a | b |\n|---|---|')).toBe(
        '<div class="md-tw"><table><thead><tr><th>a</th><th>b</th></tr></thead><tbody></tbody></table></div>',
      );
    });
  });

  describe('other blocks', () => {
    it('renders quotes, rules and strikethrough', () => {
      expect(renderMarkdown('> **Note** one\n> two\n\n---\n~~old~~ new')).toBe(
        '<blockquote><p><b>Note</b> one two</p></blockquote><hr><p><s>old</s> new</p>',
      );
    });
    it('a quote can hold a list', () => {
      expect(renderMarkdown('> - a\n> - b')).toBe('<blockquote><ul><li>a</li><li>b</li></ul></blockquote>');
    });
    it('keeps the screenshot answer apart: table, heading, code', () => {
      const h = renderMarkdown('**Key parameters**\n\n| P | V |\n|---|---|\n| -t | url |\n\n**Example**\n\n```bash\ndocker run x\n```');
      expect(h).toContain('<table>');
      expect(h).toContain('<pre class="md-code" data-lang="bash"><code>docker run x</code></pre>');
      expect(h).not.toContain('|');
    });
  });
});
