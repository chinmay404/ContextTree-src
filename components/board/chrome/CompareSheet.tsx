'use client';
/** Compare a chat with its siblings, side by side; keep one and the others fold (V2 compare-modal, promote). */
import './focus.css';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import { modelInfo } from '../lib/catalog';
import { chatData, chatsOf, qNum } from '../lib/graph';
import { renderMarkdown } from '../lib/markdown';
import { useBoard, useSnapshot } from '../context';
import { Icon } from './Icon';
import { useEscape } from './escape';

export function CompareSheet(): ReactElement {
  const { store } = useBoard();
  const snap = useSnapshot();
  const open = snap.ui.compare;
  const boxRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const shown = useRef<string | null>(null);   // the sheet keeps its content while it fades out
  if (open) shown.current = open;
  const cid = open ?? shown.current;
  const [linked, setLinked] = useState(true);
  const cols = useRef<(HTMLDivElement | null)[]>([]);
  const syncing = useRef(false);

  const close = useCallback(() => { store.closeCompare(); }, [store]);
  useEscape(!!open, close);

  const isOpen = !!open;
  // The focus view behind is out of reach while compare is open.
  useLayoutEffect(() => {
    if (!isOpen) return;
    const f = document.querySelector<HTMLElement>('[data-pb="focus"]');
    if (!f || f.inert) return;
    f.inert = true;
    return () => { f.inert = f.getAttribute('aria-hidden') === 'true'; };
  }, [isOpen]);
  useLayoutEffect(() => {
    if (isOpen) {
      if (!opener.current) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (!boxRef.current?.contains(document.activeElement)) boxRef.current?.focus({ preventScroll: true });
    } else if (opener.current) {
      const o = opener.current;
      opener.current = null;
      const target = o.isConnected && !o.closest('[inert]') ? o : document.querySelector<HTMLElement>('[data-pb="focus"] [data-act="more"]');
      target?.focus({ preventScroll: true });
    }
  }, [isOpen]);

  // Columns follow each other by scroll ratio (V2 compare's scrollLinked).
  const onScroll = (idx: number) => (e: React.UIEvent<HTMLDivElement>): void => {
    if (!linked || syncing.current) return;
    const src = e.currentTarget, srcMax = src.scrollHeight - src.clientHeight;
    if (srcMax <= 0) return;
    const ratio = src.scrollTop / srcMax;
    syncing.current = true;
    cols.current.forEach((el, i) => {
      if (!el || i === idx) return;
      const max = el.scrollHeight - el.clientHeight;
      if (max > 0) el.scrollTop = ratio * max;
    });
    requestAnimationFrame(() => { syncing.current = false; });
  };
  useEffect(() => { syncing.current = false; }, [linked]);

  const g = store.graph();
  const chat = cid ? snap.cards.get(cid) : undefined;
  const list = chat ? chatsOf(g).filter((x) => x.id === chat.id || (!!chat.parentId && x.parentId === chat.parentId)) : [];
  cols.current.length = list.length;

  const keep = (id: string): void => { store.promote(id); store.closeCompare(); };

  return (
    <div className={`wrap${open ? ' on' : ''}`} data-pb="compare" inert={!open} aria-hidden={!open}
      onPointerDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      {chat && list.length ? (
        <div ref={boxRef} className="sheetbox cmp" role="dialog" aria-modal="true" aria-label="Compare answers" tabIndex={-1}>
          <div className="cmp-top">
            <h2>Compare</h2>
            <button type="button" className={`cp${linked ? ' on' : ''}`} aria-pressed={linked} title="Scroll all columns together"
              onClick={() => setLinked((v) => !v)}><Icon name="git-fork" />Sync scroll</button>
            <button type="button" className="ic" aria-label="Close comparison" onClick={close}><Icon name="x" /></button>
          </div>
          <div className="cmp-cols">
            {list.map((c, idx) => {
              const d = chatData(c), mi = modelInfo(d.model);
              const answer = [...(snap.messages.get(c.id) ?? [])].reverse().find((m) => m.role === 'assistant');
              return (
                <div key={c.id} className="cmp-col" data-id={c.id}>
                  <div className="cmp-h">
                    <span className="qchip">{qNum(g, c.id)}</span>
                    <span className="md"><span className="mdot" style={{ '--c': mi.color } as CSSProperties} />{mi.label}</span>
                    {d.demoted ? <span className="tag">Folded</span> : null}
                    <span className="nm">{d.name}</span>
                  </div>
                  <div className="cmp-body" ref={(el) => { cols.current[idx] = el; }} onScroll={onScroll(idx)}>
                    {answer
                      ? <div className="art"><div className="body" dangerouslySetInnerHTML={{ __html: renderMarkdown(answer.content) }} /></div>
                      : <div className="cmp-none">No answer yet.</div>}
                  </div>
                  <div className="cmp-foot"><button type="button" className="btn primary" onClick={() => keep(c.id)}>Keep this one</button></div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
