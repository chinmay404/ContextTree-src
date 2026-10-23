import { describe, expect, it } from 'vitest';
import { safeUrl, sourcesPhrase, webChips, webCountLabel, webHeader, webRowHTML } from './web-results';

describe('web results', () => {
  it('builds one chip per hit with site and a fallback title', () => {
    const c = webChips([{ title: 'Pricing', url: 'https://example.com/p' }, { url: 'https://a.org/x' }, { title: 'No link' }]);
    expect(c.map((x) => x.site)).toEqual(['example.com', 'a.org', '']);
    expect(c.map((x) => x.title)).toEqual(['Pricing', 'a.org', 'No link']);
    expect(c[2].href).toBeNull();
  });
  it('only opens http(s) links', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('https://x.io')).toBe('https://x.io');
  });
  it('header names the query when there is one', () => {
    expect(webHeader('best pricing')).toBe('Searched the web for “best pricing”');
    expect(webHeader(undefined)).toBe('Web results');
    expect(webHeader('  ')).toBe('Web results');
  });
  it('counts', () => {
    expect(webCountLabel(1)).toBe('1 web result');
    expect(webCountLabel(3)).toBe('3 web results');
    expect(sourcesPhrase(2, 3)).toBe('2 sources · 3 web');
    expect(sourcesPhrase(1, 0)).toBe('1 source');
    expect(sourcesPhrase(0, 2)).toBe('0 sources · 2 web');
  });
  it('html: expanded is one scroller of safe links, collapsed is one chip; everything escaped', () => {
    const r = [{ title: '<b>x</b>', url: 'https://e.com/?a="1"' }, { title: 'two', url: 'javascript:1' }];
    const open = webRowHTML(r, 'q<script>', false);
    expect(open).not.toContain('<b>x');
    expect(open).not.toContain('<script>');
    expect(open).toContain('rel="noopener noreferrer"');
    expect(open).toContain('target="_blank"');
    expect(open.match(/<a /g)).toHaveLength(1);
    expect(open).not.toContain('javascript:');
    const shut = webRowHTML(r, undefined, true);
    expect(shut).toContain('2 web results');
    expect(shut).not.toContain('<a ');
  });
});
