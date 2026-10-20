import { cut, esc, sizeOf, strip, formatWhen } from './format';

describe('format', () => {
  it('cut clips with an ellipsis and leaves short text alone', () => {
    expect(cut('hello', 10)).toBe('hello');
    expect(cut('abcdefghij', 5)).toBe('abcd…');
    expect(cut(null, 5)).toBe('');
  });
  it('sizeOf formats KB and MB', () => {
    expect(sizeOf(100)).toBe('1 KB');
    expect(sizeOf(2500)).toBe('3 KB');
    expect(sizeOf(2_500_000)).toBe('2.5 MB');
  });
  it('esc escapes & < > double and single quotes and tolerates null', () => {
    expect(esc('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
    expect(esc("it's")).toBe('it&#39;s');
    expect(esc(undefined)).toBe('');
  });
});

describe('strip and formatWhen', () => {
  it('strip removes tags and collapses whitespace', () => {
    expect(strip('<p>Hello <b>big</b>\n world</p>')).toBe('Hello big world');
    expect(strip(null)).toBe('');
  });
  it('formatWhen gives weekday and HH:MM local', () => {
    const d = new Date(2026, 9, 19, 10, 12); // Mon 19 Oct 2026, local
    expect(formatWhen(d.toISOString())).toBe('Mon 10:12');
  });
  it('formatWhen tolerates a bad date', () => {
    expect(formatWhen('nope')).toBe('');
  });
});
