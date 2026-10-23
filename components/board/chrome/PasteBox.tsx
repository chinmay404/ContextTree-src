'use client';
/**
 * The paste box (V, or a paste on the board): one field in the middle of the screen. A link shows what it is (title, site,
 * a line about it, a picture) and clicking it or pressing Enter adds it; text shows as a note and is added the same way.
 * Several links make a list, each addable. Nothing is read or stored until it is added.
 */
import './paste-box.css';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import { ApiError, type EngineApi, type LinkPreview } from '../api/types';
import { useBoard, useSnapshot } from '../context';
import { parsePasted, urlOnlyPreview } from '../lib/link-preview';
import type { BoardEngine } from '../engine/board-engine';
import type { BoardStore } from '../store';
import { Icon } from './Icon';
import { useEscape } from './escape';

type Pv = { state: 'loading' | 'ok' | 'error'; data: LinkPreview };

export function PasteBox(): ReactElement {
  const { store, engine, props } = useBoard();
  const { ui } = useSnapshot();
  const open = ui.pasteBox;
  const shown = useRef(open);
  if (open) shown.current = open;
  const cur = open ?? shown.current;
  return (
    <div className={`wrap${open ? ' on' : ''}`} data-pb="paste" inert={!open} aria-hidden={!open}
      onPointerDown={(e) => { if (e.target === e.currentTarget) store.closePaste(); }}>
      {cur ? <Inner key={cur.seq} open={!!open} initial={cur.text} store={store} engine={engine} api={props.api} /> : null}
    </div>
  );
}

function Inner(p: { open: boolean; initial: string; store: BoardStore; engine: BoardEngine | null; api: EngineApi }): ReactElement {
  const { store, engine, api } = p;
  const [text, setText] = useState(p.initial);
  const [pv, setPv] = useState<Record<string, Pv>>({});
  const ta = useRef<HTMLTextAreaElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const parsed = useMemo(() => parsePasted(text), [text]);
  const urls = useMemo(() => (parsed.kind === 'links' ? parsed.urls : []), [parsed]);
  const urlKey = urls.join('\n');

  useEscape(p.open, () => store.closePaste());

  // Focus the field when the box opens; give focus back to where it was when it closes.
  useLayoutEffect(() => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const el = ta.current;
    if (el) { el.focus({ preventScroll: true }); el.setSelectionRange(el.value.length, el.value.length); }
    return () => {
      const o = opener.current, a = document.activeElement;
      if (o?.isConnected && !o.closest('[inert]') && (!a || a === document.body || a.closest('[data-pb="paste"]'))) o.focus({ preventScroll: true });
    };
  }, []);

  // Preview each link once, shortly after typing stops. Without the engine's route the preview is built from the address.
  useEffect(() => {
    if (!urlKey) return;
    const list = urlKey.split('\n');
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      for (const url of list) {
        setPv((cur) => (cur[url] ? cur : { ...cur, [url]: { state: 'loading', data: urlOnlyPreview(url) } }));
        void (async () => {
          try {
            const data = api.previewLink ? await api.previewLink(url, ctrl.signal) : urlOnlyPreview(url);
            if (!ctrl.signal.aborted) setPv((cur) => ({ ...cur, [url]: { state: 'ok', data } }));
          } catch (e) {
            if (ctrl.signal.aborted) return;
            const bad = e instanceof ApiError && (e.status === 400 || e.status === 422);
            setPv((cur) => ({ ...cur, [url]: { state: bad ? 'error' : 'ok', data: urlOnlyPreview(url) } }));
          }
        })();
      }
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [urlKey, api]);

  const addNote = useCallback((t: string) => {
    if (!engine) return;
    engine.addPastedNote(t, engine.selectedDesk());
    store.closePaste();
  }, [engine, store]);

  const addLinks = useCallback((list: string[]) => {
    if (!engine || !list.length) return;
    const deskId = engine.selectedDesk();
    let failed = 0;
    for (const u of list) if (!engine.addLink(u, deskId, null)) failed++;
    if (failed) store.toast("That doesn't look like a link.");
    store.closePaste();
  }, [engine, store]);

  const addAll = useCallback(() => {
    if (parsed.kind === 'text') addNote(parsed.text);
    else if (parsed.kind === 'links') addLinks(parsed.urls.filter((u) => pv[u]?.state !== 'error'));
  }, [parsed, pv, addNote, addLinks]);

  const canAdd = parsed.kind === 'text' || urls.some((u) => pv[u]?.state !== 'error');
  const many = urls.length > 1;

  return (
    <div className="sheetbox pastebox" role="dialog" aria-modal="true" aria-label="Paste a link or text">
      <textarea ref={ta} id="pb-in" rows={2} value={text} placeholder="Paste a link or some text" aria-label="Link or text" autoComplete="off" spellCheck={false}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (canAdd) addAll(); } }} />
      {parsed.kind === 'empty' && <p className="pbhint">A link is fetched and shown here, text becomes a note. Press Enter to add it.</p>}
      {parsed.kind === 'text' && (
        <button type="button" className="pv pvnote f-note" data-act="pv-note" onClick={() => addNote(parsed.text)}>
          <span className="tile"><Icon name="sticky-note" /></span>
          <span className="tx"><b>Note</b><span className="body">{parsed.text.slice(0, 600)}</span></span>
          <span className="add">Add</span>
        </button>
      )}
      {urls.map((u) => {
        const v: Pv = pv[u] ?? { state: 'loading', data: urlOnlyPreview(u) };
        const d = v.data, video = d.kind === 'video';
        if (v.state === 'error') {
          return (
            <div key={u} className="pv pverr" role="alert" data-state="error">
              <span className="tile"><Icon name="triangle-alert" /></span>
              <span className="tx"><b>Couldn&apos;t open that link</b><span className="body">{d.site}</span></span>
              <button type="button" className="add" data-act="pv-asnote" onClick={() => addNote(u)}>Add as note instead</button>
            </div>
          );
        }
        return (
          <button key={u} type="button" className={`pv pvlink${v.state === 'loading' ? ' loading' : ''}`} data-act="pv-link" data-state={v.state} data-kind={d.kind}
            onClick={() => addLinks([u])}>
            <span className={`tile${d.image ? ' img' : ''}`} style={d.image ? ({ backgroundImage: `url("${d.image}")` } as CSSProperties) : undefined}>
              {!d.image && <Icon name={video ? 'play' : 'globe'} />}
            </span>
            <span className="tx">
              <b className="ttl">{d.title ?? d.site}</b>
              <span className="site">{d.site}{video ? ' · YouTube' : ''}</span>
              <span className="body">{video ? 'Reading videos is coming soon. It is added as a card you can keep.' : d.description ?? (v.state === 'loading' ? 'Looking at the page…' : '')}</span>
            </span>
            <span className="add">Add</span>
          </button>
        );
      })}
      <div className="pbfoot">
        <span className="pbkeys">{many ? 'Enter adds all' : 'Enter adds'} · Shift+Enter is a new line · Esc closes</span>
        <button type="button" className="btn" data-act="pb-cancel" onClick={() => store.closePaste()}>Cancel</button>
        <button type="button" className="btn primary" data-act="pb-add" disabled={!canAdd} onClick={addAll}>{many ? 'Add all' : 'Add'}</button>
      </div>
    </div>
  );
}
