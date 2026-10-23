// @vitest-environment jsdom
import { clamp, typing } from './util';

it('clamp keeps a value inside the range', () => {
  expect([clamp(5, 0, 3), clamp(-1, 0, 3), clamp(2, 0, 3)]).toEqual([3, 0, 2]);
});

it('typing is true inside fields and contenteditable, false elsewhere', () => {
  document.body.innerHTML = '<div id="d"><span id="s"></span></div><textarea id="t"></textarea><div contenteditable="true"><b id="c"></b></div>';
  const el = (id: string) => document.getElementById(id);
  expect([typing(el('t')), typing(el('c')), typing(el('s')), typing(null)]).toEqual([true, true, false, false]);
});

it('a plain-text editor (the note on its card) counts as typing too', () => {
  document.body.innerHTML = '<div contenteditable="plaintext-only"><b id="p"></b></div>';
  expect(typing(document.getElementById('p'))).toBe(true);
});
