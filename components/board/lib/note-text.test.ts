// @vitest-environment jsdom
import { NOTE_MAX_CHARS, editableOffset, editableText, insertPlain, noteRest, noteTitle } from './note-text';

const box = (html: string): HTMLElement => { const d = document.createElement('div'); d.innerHTML = html; document.body.appendChild(d); return d; };
afterEach(() => { document.body.innerHTML = ''; });

describe('noteTitle: a note is named by its first line', () => {
  it('takes the first line that has words, without Markdown marks', () => {
    expect(noteTitle('# Plan\n**Ask** about *annual* plans')).toBe('Plan');
    expect(noteTitle('\n\n  - **one** thing\n- two')).toBe('one thing');
    expect(noteTitle('1. first step\n2. second')).toBe('first step');
    expect(noteTitle('> quoted `code` line')).toBe('quoted code line');
    expect(noteTitle('see [the deck](https://x.io) now')).toBe('see the deck now');
  });
  it('strips inline marks however they are nested, and never clips a mark in half', () => {
    expect(noteTitle('Putting `/security-review` in a hook')).toBe('Putting /security-review in a hook');
    expect(noteTitle('***both*** and ~~gone~~ and __under__')).toBe('both and gone and under');
    expect(noteTitle('Putting `/security-review` in the middle of a long line')).toBe('Putting /security-review in the m…');
    expect(noteTitle('![chart](a.png) of *costs*')).toBe('chart of costs');
  });
  it('leaves characters alone when they are not marks', () => {
    expect(noteTitle('snake_case_name stays')).toBe('snake_case_name stays');
    expect(noteTitle('2 * 3 * 4 = 24')).toBe('2 * 3 * 4 = 24');
    expect(noteTitle('#hashtag is text')).toBe('#hashtag is text');
  });
  it('is clipped like any name, and empty for an empty note', () => {
    expect(noteTitle('Costs ≈ $0.40 per active user a month. Never go below $8.')).toBe('Costs ≈ $0.40 per active user a m…');
    expect(noteTitle('')).toBe('');
    expect(noteTitle('  \n # \n')).toBe('');
  });
});

it('noteRest is the words after the name, on one line, without marks', () => {
  expect(noteRest('# Plan\n\n**Ask** about annual\n- one\n- two')).toBe('Ask about annual one two');
  expect(noteRest('Only line')).toBe('');
  expect(noteRest('')).toBe('');
});

describe('editableText: what an edited note holds, line breaks included', () => {
  it('maps <br> and block elements to new lines', () => {
    expect(editableText(box('Para one.<div>## Heading</div><div>You want X.</div>'))).toBe('Para one.\n## Heading\nYou want X.');
    expect(editableText(box('one<br>two<br>three'))).toBe('one\ntwo\nthree');
    expect(editableText(box('<p>one</p><p>two</p>'))).toBe('one\ntwo');
  });
  it('keeps empty lines and drops the placeholder <br> that ends a block', () => {
    expect(editableText(box('a<div><br></div><div>c</div>'))).toBe('a\n\nc');
    expect(editableText(box('a<br>'))).toBe('a');
    expect(editableText(box('a<br><br>'))).toBe('a\n');
    expect(editableText(box('<div>a<br></div><div>b</div>'))).toBe('a\nb');
  });
  it('keeps new lines that are already text, and turns no-break spaces into spaces', () => {
    expect(editableText(box('x'))).toBe('x');
    const d = box(''); d.textContent = 'line one\n## line two end';
    expect(editableText(d)).toBe('line one\n## line two end');
  });
});

describe('editableOffset: a caret position as an index into editableText', () => {
  it('counts a <br> as one character', () => {
    const d = box('a<br>bc');
    expect(editableOffset(d, d.childNodes[2], 1)).toBe(3);
    expect(editableOffset(d, d, 2)).toBe(2);   // just after the <br>
  });
  it('counts the start of a block as one character', () => {
    const d = box('a<div>bc</div>');
    expect(editableOffset(d, d.querySelector('div')!.firstChild!, 1)).toBe(3);
  });
});

describe('insertPlain: a paste is one text node at the caret, new lines kept', () => {
  const caret = (node: Node, off: number) => { const r = document.createRange(); r.setStart(node, off); r.collapse(true); const s = getSelection()!; s.removeAllRanges(); s.addRange(r); };
  it('inserts at the caret, leaves one text node and puts the caret after the paste', () => {
    const d = box(''); d.textContent = 'Start. End.';
    caret(d.firstChild!, 7);
    insertPlain(d, 'Para one.\n## Heading\nYou want X.\n');
    expect(d.childNodes).toHaveLength(1);
    expect(d.textContent).toBe('Start. Para one.\n## Heading\nYou want X.\nEnd.');
    const s = getSelection()!;
    expect(s.isCollapsed).toBe(true);
    expect(editableOffset(d, s.anchorNode!, s.anchorOffset)).toBe('Start. Para one.\n## Heading\nYou want X.\n'.length);
  });
  it('replaces a selection, and cleans any <br> the browser left', () => {
    const d = box('one<br>two'); const r = document.createRange();
    r.setStart(d.lastChild!, 0); r.setEnd(d.lastChild!, 3);
    getSelection()!.removeAllRanges(); getSelection()!.addRange(r);
    insertPlain(d, 'A\nB');
    expect(d.querySelector('br')).toBeNull();
    expect(editableText(d)).toBe('one\nA\nB');
  });
  it('turns the line ends of a Windows clipboard into new lines', () => {
    const d = box('');
    expect(insertPlain(d, 'a\r\nb\rc')).toBe('a\nb\nc');
  });
  it('appends at the end when the caret is elsewhere', () => {
    const d = box(''); d.textContent = 'x';
    getSelection()!.removeAllRanges();
    insertPlain(d, '\ny');
    expect(editableText(d)).toBe('x\ny');
  });
});

it('a note holds what the engine reads: 4000 characters', () => {
  expect(NOTE_MAX_CHARS).toBe(4000);
});
