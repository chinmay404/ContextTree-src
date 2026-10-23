'use client';
/**
 * Light formatting for notes (P15): a small bar over a selection inside a note (on its card or in the note viewer), and
 * Ctrl/Cmd+B, I and K. The note's text stays Markdown; the edits are lib/md-format.ts.
 */
import './format-bar.css';
import { memo, useEffect, useRef, useState, type ReactElement } from 'react';
import { applyFormat, type FormatKind } from '../lib/md-format';
import { Icon } from './Icon';

/** The editable a format applies to: a note on its card (plain-text editing) or the note viewer's textarea. */
const EDITABLE = '.pb-root .note-in .n:not(.md), .pb-root textarea.editor';

const isEditable = (el: Element | null): el is HTMLElement => !!el && el.matches(EDITABLE);

interface Field { get(): { value: string; start: number; end: number }; set(v: string, start: number, end: number): void }

function textOffset(root: HTMLElement, node: Node, off: number): number {
  const r = document.createRange();
  r.selectNodeContents(root); r.setEnd(node, off);
  return r.toString().length;
}

function fieldOf(el: HTMLElement): Field {
  if (el instanceof HTMLTextAreaElement) {
    return {
      get: () => ({ value: el.value, start: el.selectionStart, end: el.selectionEnd }),
      set(v, start, end) {
        // through the native setter so React's onChange sees it
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(el, v);
        el.setSelectionRange(start, end);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      },
    };
  }
  return {
    get() {
      const s = getSelection();
      const value = el.textContent ?? '';
      if (!s || !s.rangeCount || !el.contains(s.anchorNode) || !el.contains(s.focusNode)) return { value, start: value.length, end: value.length };
      const a = textOffset(el, s.anchorNode!, s.anchorOffset), b = textOffset(el, s.focusNode!, s.focusOffset);
      return { value, start: Math.min(a, b), end: Math.max(a, b) };
    },
    set(v, start, end) {
      el.textContent = v;
      const t = el.firstChild;
      if (t) { const r = document.createRange(); r.setStart(t, Math.min(start, v.length)); r.setEnd(t, Math.min(end, v.length)); const s = getSelection(); s?.removeAllRanges(); s?.addRange(r); }
      el.dispatchEvent(new Event('input', { bubbles: true }));
    },
  };
}

function apply(el: HTMLElement, kind: FormatKind): void {
  const f = fieldOf(el), cur = f.get();
  const e = applyFormat(cur.value, cur.start, cur.end, kind);
  f.set(e.value, e.start, e.end);
}

const BUTTONS: { k: FormatKind; label: string; icon: string; tip: string }[] = [
  { k: 'bold', label: 'Bold', icon: 'bold', tip: 'Bold  (Ctrl/Cmd+B)' },
  { k: 'italic', label: 'Italic', icon: 'italic', tip: 'Italic  (Ctrl/Cmd+I)' },
  { k: 'heading', label: 'Heading', icon: 'heading', tip: 'Heading' },
  { k: 'bullet', label: 'Bullet list', icon: 'list', tip: 'Bullet list' },
  { k: 'number', label: 'Numbered list', icon: 'list-ordered', tip: 'Numbered list' },
  { k: 'link', label: 'Link', icon: 'link', tip: 'Link  (Ctrl/Cmd+K)' },
  { k: 'code', label: 'Code', icon: 'code', tip: 'Code' },
];

export function FormatBar(): ReactElement {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const target = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const place = (): void => {
      const a = document.activeElement;
      if (!isEditable(a)) { target.current = null; setAt(null); return; }
      let rect: DOMRect | null = null;
      if (a instanceof HTMLTextAreaElement) {
        if (a.selectionStart === a.selectionEnd) { setAt(null); return; }
        const r = a.getBoundingClientRect();
        rect = new DOMRect(r.left + 14, r.top, 0, 0);   // a textarea has no per-selection box: the bar sits above its corner
      } else {
        const s = getSelection();
        if (!s || !s.rangeCount || s.isCollapsed || !a.contains(s.anchorNode)) { setAt(null); return; }
        rect = s.getRangeAt(0).getBoundingClientRect();
      }
      target.current = a;
      const w = 290;
      const x = Math.round(Math.max(8, Math.min(innerWidth - w - 8, rect.left + rect.width / 2 - w / 2))), y = Math.round(Math.max(8, rect.top - 46));
      setAt((cur) => (cur && cur.x === x && cur.y === y ? cur : { x, y }));   // same place: no re-render, or a press on a button loses its target between down and up
    };
    const key = (e: KeyboardEvent): void => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      const a = document.activeElement, k = e.key.toLowerCase();
      if (!isEditable(a) || !['b', 'i', 'k'].includes(k)) return;
      e.preventDefault(); e.stopPropagation();
      apply(a, k === 'b' ? 'bold' : k === 'i' ? 'italic' : 'link');
      requestAnimationFrame(place);
    };
    document.addEventListener('selectionchange', place);
    document.addEventListener('select', place, true);
    document.addEventListener('keyup', place, true);
    document.addEventListener('pointerup', place, true);
    document.addEventListener('focusout', place, true);
    document.addEventListener('keydown', key, true);
    return () => {
      document.removeEventListener('selectionchange', place);
      document.removeEventListener('select', place, true);
      document.removeEventListener('keyup', place, true);
      document.removeEventListener('pointerup', place, true);
      document.removeEventListener('focusout', place, true);
      document.removeEventListener('keydown', key, true);
    };
  }, []);

  return (
    <div className={`float fmtbar${at ? ' on' : ''}`} data-pb="fmtbar" role="toolbar" aria-label="Format" inert={!at} aria-hidden={!at}
      style={at ? { left: at.x, top: at.y } : undefined}
      onMouseDown={(e) => e.preventDefault()}>   {/* pressing the bar must not take the selection away from the note (a pointerdown preventDefault would swallow the click) */}
      <Buttons target={target} />
    </div>
  );
}

/** Its own memo component: the bar moves with the selection, but its buttons must stay the same DOM between a press and its release. */
const Buttons = memo(function Buttons({ target }: { target: { current: HTMLElement | null } }): ReactElement {
  return (
    <>
      {BUTTONS.map((b) => (
        <button key={b.k} type="button" data-fmt={b.k} aria-label={b.label} title={b.tip}
          onClick={() => { const t = target.current; if (t) { apply(t, b.k); t.focus({ preventScroll: true }); } }}>
          <Icon name={b.icon} />
        </button>
      ))}
    </>
  );
});
