import { appendBlock, quoteBlock, quoteOf } from './selection-quote';

describe('quoteOf', () => {
  it('prefixes every line, squeezes spaces, drops empty lines', () => {
    expect(quoteOf('one  line')).toBe('> one line');
    expect(quoteOf('first\n\n  second\r\nthird ')).toBe('> first\n> second\n> third');
    expect(quoteOf('   \n ')).toBe('');
  });
  it('keeps Markdown characters as they are: the quote is text, not markup', () => {
    expect(quoteOf('**bold** <b>x</b>')).toBe('> **bold** <b>x</b>');
  });
});

describe('quoteBlock and appendBlock', () => {
  it('a block ends with a blank line', () => { expect(quoteBlock('a b')).toBe('> a b\n\n'); expect(quoteBlock('')).toBe(''); });
  it('the first block is the whole note', () => { expect(appendBlock('', '> a\n\n')).toBe('> a\n\n'); });
  it('a later block goes after one blank line, however the note ended', () => {
    expect(appendBlock('> a\n\n', '> b\n\n')).toBe('> a\n\n> b\n\n');
    expect(appendBlock('> a\n\nmy comment', '> b\n\n')).toBe('> a\n\nmy comment\n\n> b\n\n');
    expect(appendBlock('my comment\n', '> b\n\n')).toBe('my comment\n\n> b\n\n');
  });
  it('an empty block changes nothing', () => { expect(appendBlock('x', '')).toBe('x'); });
});
