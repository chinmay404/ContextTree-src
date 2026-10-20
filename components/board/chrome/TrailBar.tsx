'use client';
/** The path from the root question to the selected chat, as Q chips (prototype 865-871). */
import type { ReactElement } from 'react';
import { useBoard, useSnapshot } from '../context';
import { ancestors, chatData, isChat, qNum } from '../lib/graph';

export function TrailBar(): ReactElement {
  const { store, engine } = useBoard();
  const { ui } = useSnapshot();
  const g = store.graph();
  const sel = ui.selected ? g.cards.get(ui.selected) : undefined;
  if (!sel || !isChat(sel)) {
    return (
      <div className="float" data-pb="trail">
        <span className="lb">Trail</span><span className="hint">Pick a chat to see the questions that led to it.</span>
      </div>
    );
  }
  const path = [...ancestors(g, sel.id).reverse(), sel];
  return (
    <div className="float" data-pb="trail">
      <span className="lb">Trail</span>
      {path.map((c, i) => (
        <span key={c.id} style={{ display: 'contents' }}>
          {i > 0 && <span className="arr" aria-hidden="true">→</span>}
          <button type="button" className={c.id === sel.id ? 'here' : ''} data-go={c.id} aria-current={c.id === sel.id ? 'true' : undefined}
            onClick={() => { store.select(c.id); engine?.flyTo(c.id); }}>
            <span className={`qchip${c.id === sel.id ? '' : ' soft'}`}>{qNum(g, c.id)}</span>{chatData(c).name || 'Untitled'}
          </button>
        </span>
      ))}
    </div>
  );
}
