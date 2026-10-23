import { normalizeUrl, parsePasted, urlOnlyPreview, youtubeId } from './link-preview';

describe('parsePasted', () => {
  it('nothing, a link, a bare domain, several links, text', () => {
    expect(parsePasted('  \n ')).toEqual({ kind: 'empty' });
    expect(parsePasted('https://example.com/a?b=1')).toEqual({ kind: 'links', urls: ['https://example.com/a?b=1'] });
    expect(parsePasted('example.com/pricing')).toEqual({ kind: 'links', urls: ['https://example.com/pricing'] });
    expect(parsePasted('https://a.com\nhttps://b.com  c.org')).toEqual({ kind: 'links', urls: ['https://a.com/', 'https://b.com/', 'https://c.org/'] });
    expect(parsePasted('Remember to ask about the discount tiers')).toEqual({ kind: 'text', text: 'Remember to ask about the discount tiers' });
  });
  it('a note that merely contains a link is text, so it stays a note', () => {
    expect(parsePasted('see https://example.com for the price').kind).toBe('text');
    expect(parsePasted('https://a.com and then some words').kind).toBe('text');
  });
  it('the same link twice is listed once; more than eight links are text', () => {
    expect(parsePasted('https://a.com https://a.com')).toEqual({ kind: 'links', urls: ['https://a.com/'] });
    expect(parsePasted(Array.from({ length: 9 }, (_, i) => `https://s${i}.com`).join('\n')).kind).toBe('text');
  });
  it('other schemes and lookalikes are not links', () => {
    for (const t of ['javascript:alert(1)', 'ftp://x.com/f', 'file:///etc/passwd', 'v1.2', 'e.g.', 'hello.world!']) expect(normalizeUrl(t), t).toBeNull();
    expect(parsePasted('ftp://x.com/f').kind).toBe('text');
  });
});

describe('youtube and the address-only preview', () => {
  it('finds the video id in the usual shapes', () => {
    expect(youtubeId('https://youtu.be/abc123')).toBe('abc123');
    expect(youtubeId('https://www.youtube.com/watch?v=abc123&t=3')).toBe('abc123');
    expect(youtubeId('https://www.youtube.com/shorts/abc123')).toBe('abc123');
    expect(youtubeId('https://example.com/watch?v=abc123')).toBeNull();
  });
  it('a web link previews as its host and path; a video as a thumbnail', () => {
    expect(urlOnlyPreview('https://www.example.com/pricing')).toEqual({
      url: 'https://www.example.com/pricing', kind: 'web', title: 'example.com/pricing', site: 'example.com', description: null, image: null,
    });
    expect(urlOnlyPreview('https://youtu.be/abc123')).toMatchObject({ kind: 'video', title: 'YouTube video', image: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg' });
  });
});
