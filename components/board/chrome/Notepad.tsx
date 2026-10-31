'use client';
/**
 * The notepad of the focus view (S6): the chat's one note, on the right of the conversation. It is an ordinary note on the
 * chat's desk (data.notepadFor), so the chat reads it as context and the board shows it like any note; this is only a
 * bigger place to write in. It saves like the note viewer does (one write after typing stops) and shows when that happened.
 */
import './notepad.css';
import { useEffect, useLayoutEffect, useRef, useState, type ReactElement } from 'react';
import type { Card, SourceData } from '../api/types';
import { chatData } from '../lib/graph';
import { NOTE_MAX_CHARS } from '../lib/note-text';
import { useBoard, useSnapshot } from '../context';
import { Icon } from './Icon';
import { useEscape } from './escape';

export function Notepad({ chat }: { chat: Card }): ReactElement | null {
  const { store } = useBoard();
  const snap = useSnapshot();
  const note = store.notepadOf(chat.id);
  const mark = snap.ui.notepad?.chatId === chat.id ? snap.ui.notepad : null;
  const open = !!mark;
  const seq = mark?.seq ?? 0;
  const [armed, setArmed] = useState(false);   // the first opening of a new panel starts from the closed look, so it slides in
  const [text, setText] = useState(note ? (note.data as SourceData).text ?? '' : '');
  const [state, setState] = useState<'saved' | 'saving'>('saved');
  const [inField, setInField] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const mine = useRef(text);        // the text this field last sent to the store
  const want = useRef(false);       // put the cursor at the end as soon as the panel is on screen
  const stamp = useRef(0);
  const noteId = note?.id;
  const stored = note ? (note.data as SourceData).text ?? '' : '';

  useEffect(() => {
    const a = requestAnimationFrame(() => requestAnimationFrame(() => setArmed(true)));
    return () => cancelAnimationFrame(a);
  }, []);

  const track = (id: string): void => {
    const s = ++stamp.current;
    setState('saving');
    void store.settled(id).then(() => { if (s === stamp.current) setState('saved'); });
  };

  // Something else changed the note (a passage added from an answer, the server): show it.
  useLayoutEffect(() => {
    if (stored !== mine.current) { mine.current = stored; setText(stored); if (noteId) track(noteId); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored, noteId]);

  // Opened, or a passage added while open: the cursor goes after the end.
  useLayoutEffect(() => { if (open) want.current = true; }, [open, seq]);
  const on = open && armed;
  useLayoutEffect(() => {
    const el = ta.current;
    if (!on || !want.current || !el || el.value !== text) return;
    want.current = false;
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
    el.scrollTop = el.scrollHeight;
  }, [on, seq, text]);

  // Esc leaves the field first; the view and the panel stay.
  useEscape(inField, () => { ta.current?.blur(); document.querySelector<HTMLElement>('[data-pb="focus"]')?.focus({ preventScroll: true }); });

  if (!note) return null;
  const name = chatData(chat).name;
  const leftOut = text.length - NOTE_MAX_CHARS;
  return (
    <aside className={`notepad${on ? ' on' : ''}`} aria-label="Notes" aria-hidden={!on} inert={!on}>
      <div className="npad">
        <div className="nph">
          <span className="npt"><Icon name="sticky-note" />Notes · {name}</span>
          <button type="button" className="npx" data-act="npclose" aria-label="Close notes" onClick={() => store.closeNotepad()}><Icon name="x" /></button>
        </div>
        <textarea ref={ta} className="editor" aria-label={`Notes for ${name}`} placeholder="Passages you pick from answers land here. Write your own thoughts too."
          value={text} spellCheck
          onFocus={() => setInField(true)} onBlur={() => setInField(false)}
          onChange={(e) => {
            const v = e.target.value;
            mine.current = v; setText(v);
            store.patchDataDebounced(note.id, { text: v });
            track(note.id);
          }} />
        <div className="npfoot" data-over={leftOut > 0 ? '' : undefined}><span className="npstate" role="status" aria-live="polite">{state === 'saving' ? 'Saving…' : 'Saved'}</span>
          <span className="nphint">{leftOut > 0
            ? `The chat reads the first ${NOTE_MAX_CHARS.toLocaleString('en-US')} characters. The last ${leftOut.toLocaleString('en-US')} are left out.`
            : 'The chat reads this with its other sources.'}</span></div>
      </div>
    </aside>
  );
}
