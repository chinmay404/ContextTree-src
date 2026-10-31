'use client';
/** What a chat's last turn sent, what it left out and why, and the why of each string into it. */
import './context-inspector.css';
import { useLayoutEffect, useRef, type ReactElement } from 'react';
import type { ContextTrace, Edge, Id, TracePassage } from '../api/types';
import { useBoard, useSnapshot } from '../context';
import { nameOf } from '../lib/graph';
import { Icon } from './Icon';
import { useEscape } from './escape';

const REASON: Record<string, string> = {
  budget: 'did not fit the budget',
  jev: 'judged not to help',
  per_source: 'over the limit for this source',
};

const percent = (score: number | null | undefined): string | null =>
  typeof score === 'number' ? `${Math.round(score * 100)}%` : null;

function PassageRow({ title, passage, note }: { title: string; passage: TracePassage; note?: string }): ReactElement {
  const score = percent(passage.score);
  return (
    <li>
      <span className="ci-name">{title}</span>
      {passage.loc ? <span className="ci-loc">{passage.loc}</span> : null}
      {score ? <span className="ci-score">{score}</span> : null}
      {note ? <span className="ci-why">{note}</span> : null}
    </li>
  );
}

function Passages({ trace, title }: { trace: ContextTrace; title: (id: Id) => string }): ReactElement {
  const { sent, dropped, agent } = trace;
  return (
    <>
      <h4>Sent to the model</h4>
      {sent.length ? <ul className="ci-list">{sent.map((p) => <PassageRow key={p.n} title={title(p.cardId)} passage={p} />)}</ul>
        : <p className="ci-empty">No sources this turn.</p>}
      {dropped.length ? (
        <>
          <h4>Left out</h4>
          <ul className="ci-list ci-out">
            {dropped.map((p, i) => <PassageRow key={i} title={title(p.cardId)} passage={p} note={REASON[p.reason] ?? p.reason} />)}
          </ul>
        </>
      ) : null}
      {agent.steps.length ? (
        <>
          <h4>Went deeper</h4>
          <ul className="ci-list">{agent.steps.map((s, i) => <li key={i}><span className="ci-name">{s.tool.replace(/_/g, ' ')}</span></li>)}</ul>
        </>
      ) : null}
    </>
  );
}

export function ContextInspector(): ReactElement {
  const { store } = useBoard();
  const snap = useSnapshot();
  const open = snap.ui.inspector;
  const shown = useRef(open);
  if (open) shown.current = open;
  const chatId = (open ?? shown.current)?.chatId ?? null;
  const boxRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEscape(!!open, () => store.closeInspector());
  useLayoutEffect(() => {
    if (open) {
      if (!opener.current) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      boxRef.current?.focus({ preventScroll: true });
    } else if (opener.current) {
      const o = opener.current;
      opener.current = null;
      if (o.isConnected) o.focus({ preventScroll: true });
    }
  }, [open]);

  const g = store.graph();
  const chat = chatId ? snap.cards.get(chatId) : undefined;
  const title = (id: Id): string => { const c = snap.cards.get(id); return c ? nameOf(g, c) : 'Deleted'; };
  const trace = chatId ? store.traceOf(chatId) : undefined;
  const strings: Edge[] = chatId ? [...snap.edges.values()].filter((e) => e.to === chatId && (e.kind === 'wire' || e.kind === 'answer')) : [];

  return (
    <div className={`wrap${open ? ' on' : ''}`} data-pb="inspector" inert={!open} aria-hidden={!open}
      onPointerDown={(e) => { if (e.target === e.currentTarget) store.closeInspector(); }}>
      {chat ? (
        <div ref={boxRef} className="sheetbox vw ci" role="dialog" aria-modal="true" aria-label="What this question read" tabIndex={-1}>
          <button type="button" className="ic vclose" aria-label="Close" onClick={() => store.closeInspector()}><Icon name="x" /></button>
          <div className="vmain">
            <div className="vhead"><div className="sx"><div className="meta">Last answer</div><h2>What this question read</h2></div></div>
            {trace === undefined ? <p className="ci-empty">Loading…</p>
              : trace === null ? <p className="ci-empty">Nothing yet. Ask this question something first.</p>
                : <Passages trace={trace} title={title} />}
          </div>
          <aside className="vside">
            <div>
              <h4>Why it is connected</h4>
              {strings.length ? strings.map((e) => (
                <label key={e.id} className="ci-string">
                  <span>{title(e.from)}</span>
                  <input key={e.why ?? ''} type="text" maxLength={200} defaultValue={e.why ?? ''} placeholder="Say why, or let the AI suggest it"
                    onBlur={(ev) => store.setEdgeWhy(e.id, ev.target.value.trim())} />
                </label>
              )) : <p className="ci-empty">No strings into this question.</p>}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
