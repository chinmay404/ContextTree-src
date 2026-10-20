'use client';
/**
 * The chat box at the bottom centre of the board (where the Trail used to be; TrailBar is kept, unmounted).
 * Layout and typing only for now: what a sent message does is still to be decided, so send is a no-op.
 */
import './chatbar.css';
import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactElement } from 'react';
import { Icon } from './Icon';

const MAX_H = 160;   // px; past this the box scrolls instead of growing

export function ChatBar(): ReactElement {
  const [text, setText] = useState('');
  const ta = useRef<HTMLTextAreaElement>(null);

  // Grow with the text, up to MAX_H.
  useLayoutEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_H)}px`;
  }, [text]);

  const send = (e?: FormEvent): void => {
    e?.preventDefault();
    if (!text.trim()) return;
    // Not wired yet: behaviour comes in a later change. The text stays in the box.
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
  };

  return (
    <form className="float" data-pb="chatbar" onSubmit={send}>
      <textarea ref={ta} rows={1} value={text} placeholder="Ask anything…" aria-label="Message"
        onChange={(e) => setText(e.target.value)} onKeyDown={onKey} />
      <button type="submit" className="cb-send" aria-label="Send" disabled={!text.trim()}><Icon name="arrow-up" /></button>
    </form>
  );
}
