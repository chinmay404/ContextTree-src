'use client';
/** The source viewer sheet: double-click a source (prototype openViewer / closeViewer, lines 980-1038). */
import './viewer.css';
import { useCallback, useLayoutEffect, useRef, type CSSProperties, type ReactElement } from 'react';
import type { Card, SourceData } from '../api/types';
import { TYPE_INFO, modelInfo } from '../lib/catalog';
import { cut } from '../lib/format';
import { chatData, famOf, isChat, membersOf, qNum, tokensOf } from '../lib/graph';
import { isRead } from '../lib/reads';
import { useBoard, useSnapshot } from '../context';
import type { UiState } from '../store';
import { Icon } from './Icon';
import { useEscape } from './escape';
import { ViewerBody } from './viewer-bodies';

type Viewing = NonNullable<UiState['viewer']>;
const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

export function SourceViewer(): ReactElement {
  const { store, engine } = useBoard();
  const snap = useSnapshot();
  const open = snap.ui.viewer;
  const boxRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const shown = useRef<Viewing | null>(null);   // the sheet keeps its content while it fades out
  if (open) shown.current = open;
  const viewing = open ?? shown.current;

  const close = useCallback(() => {
    const v = store.getSnapshot().ui.viewer;
    if (!v) return;
    store.closeViewer();
    engine?.ctx.jiggle(v.cardId, .3);
  }, [store, engine]);
  useEscape(!!open, close);

  // Focus: remember who opened it, move into the sheet, and give focus back on close.
  const isOpen = !!open;
  useLayoutEffect(() => {
    if (isOpen) {
      if (!opener.current) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (!boxRef.current?.contains(document.activeElement)) boxRef.current?.focus({ preventScroll: true });
    } else if (opener.current) {
      const o = opener.current;
      opener.current = null;
      if (o.isConnected) o.focus({ preventScroll: true });
    }
  }, [isOpen]);

  // The sheet grows out of the card it was opened from.
  const anchor = open?.anchor ?? null, key = open ? `${open.cardId}|${open.memberId ?? ''}` : '';
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box || !key) return;
    if (anchor) {
      const w = box.offsetWidth, h = box.offsetHeight;
      box.style.transformOrigin = `${clamp(anchor.left - (innerWidth - w) / 2, 0, w)}px ${clamp(anchor.top - (innerHeight - h) / 2, 0, h)}px`;
    } else box.style.transformOrigin = '50% 50%';
  }, [key, anchor]);

  const g = store.graph();
  const pile = viewing ? snap.cards.get(viewing.cardId) : undefined;
  const member = viewing?.memberId ? snap.cards.get(viewing.memberId) : undefined;
  const v: Card | undefined = member ?? pile;
  let content: ReactElement | null = null;
  if (viewing && pile && v && v.kind === 'source') {
    const d = v.data as SourceData;
    const isPile = v.sourceType === 'pile';
    const members = isPile ? membersOf(g, v.id) : [];
    const family = member ? TYPE_INFO[member.sourceType ?? 'pdf'].family : famOf(g, pile);
    const ids = new Set(isPile ? members.map((m) => m.id) : [v.id]);
    const users = [...snap.cards.values()].filter((c) => isChat(c) && store.readsOf(c.id).items.some((i) => isRead(i) && ids.has(i.cardId)));
    const info = TYPE_INFO[v.sourceType ?? 'pdf'];
    const meta = isPile ? `Pile · ${members.length} files` : d.meta || info.label;
    content = (
      <div ref={boxRef} className={`sheetbox vw f-${family}`} role="dialog" aria-modal="true" aria-label={d.title || 'Note'} tabIndex={-1}>
        <button type="button" className="ic vclose" aria-label="Close" onClick={close}><Icon name="x" /></button>
        <div className="vmain">
          <div className="vhead">
            <div className="tile"><Icon name={info.icon} /></div>
            <div className="sx">
              <div className="meta">{member ? `${(pile.data as SourceData).title ?? 'Pile'} · ` : ''}{meta}</div>
              <h2>{d.title || 'Note'}</h2>
            </div>
          </div>
          <ViewerBody card={v} members={members} url={store.fileUrl(v.id)}
            onOpenMember={(p, m, r) => store.openViewer(p.id, m.id, r)} />
        </div>
        <aside className="vside">
          <div>
            <h4>What is this for?</h4>
            <textarea key={v.id} className="desc" defaultValue={d.desc ?? ''}
              placeholder="Tell the AI why this matters, e.g. “Trust this over blog posts.”"
              onChange={(e) => store.patchDataDebounced(v.id, { desc: e.target.value })} />
          </div>
          <div>
            <h4>Read by</h4>
            <div className="used">
              {users.length ? users.map((c) => (
                <span key={c.id}>
                  <span className="mdot" style={{ '--c': modelInfo(chatData(c).model).color } as CSSProperties} />
                  <span className="qchip soft">{qNum(g, c.id)}</span>{cut(chatData(c).name, 24)}
                </span>
              )) : <span className="none">No question reads this yet. Drag from its handle on the right onto a chat, or drop it on a desk.</span>}
            </div>
          </div>
          <div><h4>Size</h4><span className="upill big">{(tokensOf(g, v) / 1000).toFixed(1)}k tokens</span></div>
          {member ? <button type="button" className="btn" onClick={() => store.openViewer(pile.id, null, viewing.anchor)}><Icon name="arrow-left" size={14} />Back to the pile</button> : null}
        </aside>
      </div>
    );
  }

  return (
    <div className={`wrap${open ? ' on' : ''}`} data-pb="viewer" inert={!open} aria-hidden={!open}
      onPointerDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      {content}
    </div>
  );
}
