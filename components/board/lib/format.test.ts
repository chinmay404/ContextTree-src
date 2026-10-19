import { cut, esc, sizeOf } from './format';

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
  it('esc escapes & < > " and tolerates null', () => {
    expect(esc('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
    expect(esc(undefined)).toBe('');
  });
});
