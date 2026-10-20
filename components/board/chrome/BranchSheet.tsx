'use client';
/** The branch / new question / chat settings sheet (prototype openDialog, renderDialog, confirmDialog, lines 895-977). */
import './branch-sheet.css';
import { useCallback, useLayoutEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactElement } from 'react';
import type { AdvancedSettings, Carry } from '../api/types';
import { FAMC, PERSONAS } from '../lib/catalog';
import { cut } from '../lib/format';
import { chatData, famOf, qNum } from '../lib/graph';
import { isRead } from '../lib/reads';
import { useBoard, useSnapshot } from '../context';
import type { DialogState } from '../store';
import { Icon } from './Icon';
import { ModelPicker } from './ModelPicker';
import { estimateTokens } from './branch-estimate';
import { useEscape } from './escape';

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);
const TITLE = { branch: 'New branch', root: 'New question', edit: 'Chat settings' } as const;
const BUTTON = { branch: 'Create branch', root: 'Create', edit: 'Save' } as const;
const CARRY: [Carry, string][] = [['summary', 'Summary + last 2'], ['whole', 'Whole chat'], ['fresh', 'Fresh start']];
const MAX_OUT: [string, string][] = [['', 'Model default'], ['500', '500 tokens'], ['1000', '1,000 tokens'], ['2000', '2,000 tokens'], ['4000', '4,000 tokens']];
const BUDGET: [string, string][] = [['', 'No limit'], ['4000', '4k'], ['8000', '8k'], ['16000', '16k'], ['32000', '32k']];

export function BranchSheet(): ReactElement {
  const { store, engine, props } = useBoard();
  const snap = useSnapshot();
  const open = snap.ui.dialog;
  const boxRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const shown = useRef<DialogState | null>(null);   // the sheet keeps its content while it fades out
  if (open) shown.current = open;
  const dlg = open ?? shown.current;

  const cancel = useCallback(() => { store.closeDialog(); }, [store]);
  const confirm = useCallback(() => { engine?.confirmBranch(); }, [engine]);
  useEscape(!!open, cancel);

  // Focus: First question when it exists, else Name; give focus back to the opener on close unless something took it.
  const isOpen = !!open, hasFirst = !!open && open.mode !== 'edit';
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (isOpen) {
      if (!opener.current) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      box?.querySelector<HTMLElement>(hasFirst ? '#d-first' : '#d-name')?.focus({ preventScroll: true });
    } else if (opener.current) {
      const o = opener.current;
      opener.current = null;
      const a = document.activeElement;
      if (o.isConnected && (!a || a === document.body || box?.contains(a))) o.focus({ preventScroll: true });
    }
  }, [isOpen, hasFirst]);

  // The sheet grows out of the button it was opened from.
  const anchor = open?.anchor ?? null;
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box || !isOpen) return;
    if (anchor) {
      const w = box.offsetWidth, h = box.offsetHeight;
      box.style.transformOrigin = `${clamp(anchor.left + anchor.width / 2 - (innerWidth - w) / 2, 0, w)}px ${clamp(anchor.top - (innerHeight - h) / 2, 0, h)}px`;
    } else box.style.transformOrigin = '50% 50%';
  }, [isOpen, anchor]);

  let content: ReactElement | null = null;
  if (dlg) {
    const d = dlg.draft, g = store.graph();
    const chat = dlg.chatId ? snap.cards.get(dlg.chatId) : undefined;
    const parent = dlg.parentId ? snap.cards.get(dlg.parentId) : undefined;
    const parentReads = parent ? store.readsOf(parent.id) : null;
    const above = parentReads ? parentReads.items.filter(isRead).map((i) => snap.cards.get(i.cardId)).filter((c): c is NonNullable<typeof c> => !!c) : [];
    const setAdv = (patch: Partial<AdvancedSettings>): void => store.setDraft({ advanced: { ...d.advanced, ...patch } });
    const est = estimateTokens(d, parent && parentReads ? { reads: parentReads, messages: snap.messages.get(parent.id) ?? [] } : null);
    const a = d.advanced;
    const from = dlg.mode === 'edit' && chat
      ? <><span className="qchip">{qNum(g, chat.id)}</span>{cut(chatData(chat).name, 56)}</>
      : parent
        ? <>From <span className="qchip soft">{qNum(g, parent.id)}</span>{cut(chatData(parent).name, 46)}</>
        : <>Starts its own tree, with an empty desk.</>;
    const flip = (): void => store.setDraft({ inheritDesk: !d.inheritDesk });
    const onToggleKey = (e: KeyboardEvent): void => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } };

    content = (
      <div ref={boxRef} className="sheetbox dlg" role="dialog" aria-modal="true" aria-labelledby="dlgt">
        <h2 id="dlgt">{TITLE[dlg.mode]}</h2>
        <div className="from">{from}</div>
        <label className="fl" htmlFor="d-name">Name</label>
        <input className="fi" id="d-name" value={d.name} onChange={(e) => store.setDraft({ name: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Enter') confirm(); }} />
        {dlg.mode !== 'edit' && (
          <div className="grp">
            <label className="fl" htmlFor="d-first">First question <span className="opt">· optional</span></label>
            <textarea className="fta" id="d-first" rows={2} placeholder="Type the question you want to ask…" value={d.first}
              onChange={(e) => store.setDraft({ first: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); confirm(); } }} />
          </div>
        )}
        <div className="grp">
          <div className="fl">Model</div>
          <ModelPicker value={d.model} onChange={(m) => store.setDraft({ model: m })}
            isLocked={props.isModelLocked} onLockedClick={(m) => props.onOpenSettings?.(m.split('/')[0])} />
        </div>
        <div className="grp">
          <div className="fl">Persona</div>
          <div className="pills">
            {(Object.entries(PERSONAS) as [string, { label: string; text: string }][]).map(([k, v]) => (
              <button key={k} type="button" className={`pp${d.persona === k ? ' on' : ''}`} data-persona={k} aria-pressed={d.persona === k}
                onClick={() => store.setDraft({ persona: k, personaText: v.text })}>{v.label}</button>
            ))}
          </div>
          <textarea className="fta" id="d-persona" rows={2} style={{ marginTop: 8 }} value={d.personaText}
            placeholder="How should it think or talk? e.g. “Be blunt. Assume I'm a solo founder.”"
            onChange={(e) => store.setDraft({ personaText: e.target.value })} />
        </div>
        {parent && (
          <div className="grp">
            <div className="fl">What it starts with</div>
            <div className={`tog${d.inheritDesk ? ' on' : ''}`} id="d-inherit" role="switch" aria-checked={d.inheritDesk} tabIndex={0}
              onClick={flip} onKeyDown={onToggleKey}>
              <span className="sw" />Read the desk above
              <span className="sub">
                {above.length ? <span className="dots">{above.slice(0, 6).map((c, i) => <i key={i} style={{ background: FAMC[famOf(g, c)][1] } as CSSProperties} />)}</span> : null}
                {above.length} source{above.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="seg" role="radiogroup" aria-label="Carry from the parent chat">
              {CARRY.map(([k, v]) => (
                <button key={k} type="button" data-carry={k} className={d.carry === k ? 'on' : ''} role="radio" aria-checked={d.carry === k}
                  onClick={() => store.setDraft({ carry: k })}>{v}</button>
              ))}
            </div>
          </div>
        )}
        <details className="adv" open={d.advOpen} onToggle={(e) => { const o = e.currentTarget.open; if (o !== d.advOpen) store.setDraft({ advOpen: o }); }}>
          <summary><Icon name="sliders-horizontal" size={15} />Advanced<span className="ch"><Icon name="chevron-down" size={16} /></span></summary>
          <div className="ab">
            <label className="full">Creativity <span className="v" id="v-temp">{a.temperature == null ? 'Model default' : a.temperature.toFixed(1)}</span>
              <input type="range" id="d-temp" min={0} max={2} step={0.1} value={a.temperature ?? 0.8} onChange={(e) => setAdv({ temperature: +e.target.value })} /></label>
            <label>Longest answer
              <select id="d-max" value={String(a.maxOutputTokens ?? '')} onChange={(e) => setAdv({ maxOutputTokens: e.target.value ? +e.target.value : null })}>
                {MAX_OUT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></label>
            <label>Conversation it keeps
              <select id="d-hist" value={a.historyMode} onChange={(e) => setAdv({ historyMode: e.target.value as AdvancedSettings['historyMode'] })}>
                <option value="auto">Automatic</option><option value="lastK">Last few messages</option>
              </select></label>
            <label>Messages kept
              <input type="number" id="d-k" min={0} max={50} value={a.lastKMessages} disabled={a.historyMode === 'auto'}
                onChange={(e) => setAdv({ lastKMessages: clamp(Math.round(+e.target.value) || 0, 0, 50) })} /></label>
            <label>Excerpts per question <span className="v" id="v-topk">{a.externalContextTopK}</span>
              <input type="range" id="d-topk" min={0} max={10} step={1} value={a.externalContextTopK} onChange={(e) => setAdv({ externalContextTopK: +e.target.value })} /></label>
            <label className="full">Token budget per question
              <select id="d-budget" value={String(a.contextBudgetTokens ?? '')} onChange={(e) => setAdv({ contextBudgetTokens: e.target.value ? +e.target.value : null })}>
                {BUDGET.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></label>
          </div>
        </details>
        <div className="dfoot">
          <span className="est">About <b id="d-est">{(est / 1000).toFixed(1)}k</b> tokens per question</span>
          <button type="button" className="btn" id="d-cancel" onClick={cancel}>Cancel</button>
          <button type="button" className="btn primary" id="d-ok" onClick={confirm}>{BUTTON[dlg.mode]}</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`wrap${open ? ' on' : ''}`} data-pb="sheet" inert={!open} aria-hidden={!open}
      onPointerDown={(e) => { if (e.target === e.currentTarget) cancel(); }}>
      {content}
    </div>
  );
}
