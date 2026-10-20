'use client';
/**
 * The focus view: a chat opened full-screen (prototype openReader, closeReader, finishClose, timelineHTML, rowHTML,
 * articleHTML, renderReader, lines 1041-1102, and the clip-path morph in the frame, 1251-1257).
 * The sheet grows out of the chat's card with a spring and shrinks back into it.
 */
import './focus.css';
import {
  useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState,
  type CSSProperties, type KeyboardEvent, type ReactElement,
} from 'react';
import type { Card, ChatData, Id, Message } from '../api/types';
import { FAMC, TYPE_INFO, modelInfo, personaLabel } from '../lib/catalog';
import { formatWhen, strip } from '../lib/format';
import { ancestors, chatData, chatsOf, famOf, isChat, membersOf, nameOf, qNum, sourceData, type Graph } from '../lib/graph';
import { renderMarkdown } from '../lib/markdown';
import { isRead } from '../lib/reads';
import { clamp } from '../engine/spring';
import { useBoard, useSnapshot } from '../context';
import { Icon } from './Icon';
import { useEscape } from './escape';
import { readRows, sourceRows, type SourceRow } from './focus-rows';

type Rect = { l: number; t: number; r: number; b: number; rad: number };
type Web = { title?: string; url?: string }[];

const FALLBACK = (): Rect => ({ l: innerWidth / 2 - 120, t: innerHeight / 2 - 80, r: innerWidth / 2 - 120, b: innerHeight / 2 - 80, rad: 20 });
const FOCUSABLE = 'button:not([disabled]), textarea:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

const Dots = ({ g, cards }: { g: Graph; cards: Card[] }): ReactElement => (
  <span className="dots">
    {cards.slice(0, 6).map((c, i) => (
      <i key={i} className={c.status === 'soon' ? 'soon' : undefined}
        style={{ background: FAMC[famOf(g, c)][1], '--dc': FAMC[famOf(g, c)][1] } as CSSProperties} />
    ))}
  </span>
);

function rowMeta(g: Graph, r: SourceRow): string {
  const c = r.card;
  if (isChat(c)) return `Answer · ${modelInfo(chatData(c).model).label}`;
  if (c.status === 'soon') return 'Coming soon';
  if (c.sourceType === 'pile') return `${membersOf(g, c.id).length} files`;
  const d = sourceData(c);
  if (r.how === 'wire') return `${d.meta || TYPE_INFO[c.sourceType ?? 'pdf'].label} · strung in`;
  return d.meta || TYPE_INFO[c.sourceType ?? 'pdf'].label;
}

const iconOf = (c: Card): string => (isChat(c) ? 'message-circle' : TYPE_INFO[c.sourceType ?? 'pdf'].icon);
const safeUrl = (u?: string): string | null => (u && /^https?:\/\//i.test(u) ? u : null);
const host = (u?: string): string => { try { return u ? new URL(u).host : ''; } catch { return ''; } };

export function FocusView(): ReactElement {
  const { store, engine } = useBoard();
  const snap = useSnapshot();
  const focusId = snap.ui.focus;
  const rootRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const progRef = useRef<ReturnType<NonNullable<typeof engine>['ctx']['springs']['make']> | null>(null);
  const rectRef = useRef<Rect>(FALLBACK());
  const shownRef = useRef<Id | null>(null);   // the chat on screen: kept while the view shrinks back
  const prevFocus = useRef<Id | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const openerAt = useRef<{ cardId: string; act: string } | null>(null);   // the card button, found again after the card re-renders
  const webMap = useRef(new Map<string, Web>());
  const [, force] = useReducer((n: number) => n + 1, 0);
  const [menu, setMenu] = useState<{ top: number; right: number } | null>(null);
  const [menuOn, setMenuOn] = useState(false);
  if (focusId) shownRef.current = focusId;
  const id = focusId ?? shownRef.current;

  const close = useCallback(() => { store.closeFocus(); }, [store]);
  useEscape(!!focusId, close);
  const closeMenu = useCallback(() => { setMenuOn(false); }, []);
  useEscape(menuOn, () => { closeMenu(); moreRef.current?.focus({ preventScroll: true }); });

  // The morph: one spring drives the clip-path, the content and the scrim (prototype 1251-1257).
  const paint = useCallback(() => {
    const prog = progRef.current, R = rootRef.current, inner = innerRef.current, scrim = scrimRef.current, shown = shownRef.current;
    if (!prog || !R || !inner || !scrim || !shown) return;
    const p = clamp(prog.x, 0, 1.04), r = rectRef.current, F = 4, L = (a: number, b: number) => a + (b - a) * p;
    R.style.clipPath = `inset(${L(r.t, F)}px ${L(r.r, F)}px ${L(r.b, F)}px ${L(r.l, F)}px round ${L(r.rad, 40)}px)`;
    const co = clamp((p - .3) / .5, 0, 1);
    inner.style.opacity = String(co); inner.style.transform = `translateY(${(1 - co) * 12}px)`;
    scrim.style.opacity = String(Math.min(1, p));
    engine?.setCardOpacity(shown, Math.max(0, 1 - p / .25));
  }, [engine]);

  useEffect(() => {
    if (!engine) return;
    const prog = engine.ctx.springs.make(0, .48, .85);
    progRef.current = prog;
    const off = engine.onFrame(() => {
      const shown = shownRef.current;
      if (!shown) return;
      paint();
      if (prog.t === 0 && prog.x < .004 && Math.abs(prog.v) < .05) {   // finishClose
        const R = rootRef.current;
        if (R) R.style.display = 'none';
        if (scrimRef.current) scrimRef.current.style.opacity = '0';
        engine.setCardOpacity(shown, null);
        shownRef.current = null;
        prog.snap(0);
        engine.ctx.render(shown);
        engine.ctx.jiggle(shown, .25);
        const at = openerAt.current; openerAt.current = null;
        const a = document.activeElement;
        if (at && (!a || a === document.body || !a.isConnected)) {
          engine.ctx.nodes.get(at.cardId)?.el.querySelector<HTMLElement>(`[data-act="${at.act}"]`)?.focus({ preventScroll: true });
        }
        force();
      }
    });
    return () => { off(); engine.ctx.springs.remove(prog); progRef.current = null; };
  }, [engine, paint]);

  // The board behind is out of reach while the view is open.
  const isOpen = !!focusId;
  useLayoutEffect(() => {
    const root = rootRef.current?.closest('.pb-root');
    if (!isOpen || !root) return;
    const set: HTMLElement[] = [];
    for (const el of Array.from(root.children)) {
      if (!(el instanceof HTMLElement) || el.inert) continue;
      if (el.dataset.pb === 'focus' || el.dataset.pb === 'scrim' || el.dataset.pb === 'filein' || el.classList.contains('wrap') || el.classList.contains('pb-toast') || el.classList.contains('pb-confirm')) continue;
      el.inert = true; set.push(el);
    }
    return () => { set.forEach((el) => { el.inert = false; }); };
  }, [isOpen]);

  // Open, switch chat, close.
  useLayoutEffect(() => {
    const prev = prevFocus.current;
    prevFocus.current = focusId;
    const prog = progRef.current, R = rootRef.current;
    if (!engine || !prog || !R) return;
    if (focusId && !prev) {
      opener.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
      const host = opener.current?.closest<HTMLElement>('[data-id]');
      openerAt.current = host && opener.current?.dataset.act ? { cardId: host.dataset.id!, act: opener.current.dataset.act } : null;
      rectRef.current = engine.cardRect(focusId) ?? FALLBACK();
      R.style.display = 'block';
      prog.cfg(.5, .82).to(1);
      paint();
      const ta = R.querySelector<HTMLTextAreaElement>('.fcomp textarea');
      (ta && !ta.disabled ? ta : R).focus({ preventScroll: true });
    } else if (focusId && prev && focusId !== prev) {
      engine.setCardOpacity(prev, null);
      engine.ctx.render(prev);
      rectRef.current = engine.cardRect(focusId) ?? rectRef.current;
      paint();
    } else if (!focusId && prev) {
      rectRef.current = engine.cardRect(prev) ?? rectRef.current;
      prog.cfg(.38, 1).to(0);
      const o = opener.current; opener.current = null;
      const target = o?.isConnected ? o : engine.ctx.nodes.get(prev)?.el ?? null;
      target?.focus({ preventScroll: true });
    }
  }, [focusId, engine, paint]);

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Tab' || !isOpen) return;
    const list = Array.from(rootRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter((el) => !el.closest('[inert]') && el.offsetParent !== null);
    if (!list.length) return;
    const first = list[0], last = list[list.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === rootRef.current)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const chat = id ? snap.cards.get(id) : undefined;
  const g = store.graph();
  const stream = id ? snap.streaming.get(id) : undefined;
  const msgs: Message[] = id ? snap.messages.get(id) ?? [] : [];
  // Keyed `<messageId>_a`: the id the engine gives the assistant message of this stream (api contract), so the list finds its answer after the stream ends.
  useEffect(() => { if (stream?.web) webMap.current.set(`${stream.messageId}_a`, stream.web); });

  let body: ReactElement | null = null;
  if (id && chat && isChat(chat)) {
    body = <FocusBody key={id} chat={chat} g={g} msgs={msgs} stream={stream} webMap={webMap.current} moreRef={moreRef}
      menu={menu} menuOn={menuOn} setMenu={setMenu} setMenuOn={setMenuOn} />;
  }

  return (
    <>
      <div ref={scrimRef} data-pb="scrim" aria-hidden="true" />
      <div ref={rootRef} data-pb="focus" role="dialog" aria-modal="true" aria-label={chat && isChat(chat) ? chatData(chat).name : 'Question'}
        tabIndex={-1} inert={!focusId} aria-hidden={!focusId} onKeyDown={onKeyDown}
        onPointerDown={(e) => { if (menuOn && !(e.target as Element).closest('[data-pb="focusmenu"], [data-act="more"]')) closeMenu(); }}>
        <div ref={innerRef} className="in">{body}</div>
      </div>
    </>
  );
}

function FocusBody(p: {
  chat: Card; g: Graph; msgs: Message[]; stream: { messageId: string; text: string; web: Web | null; error: string | null } | undefined;
  webMap: Map<string, Web>; moreRef: React.RefObject<HTMLButtonElement | null>;
  menu: { top: number; right: number } | null; menuOn: boolean;
  setMenu: (m: { top: number; right: number } | null) => void; setMenuOn: (on: boolean) => void;
}): ReactElement {
  const { store } = useBoard();
  const snap = useSnapshot();
  const { chat: c, g, msgs, stream, webMap, moreRef, menu, menuOn, setMenu, setMenuOn } = p;
  const d = chatData(c) as ChatData;
  const mi = modelInfo(d.model);
  const reads = store.readsOf(c.id);
  const rows = sourceRows(g, reads.items, d.hide ?? []);
  const read = readRows(rows);
  const total = 600 + (c.parentId ? (d.carry === 'summary' ? 720 : d.carry === 'whole' ? 1800 : 0) : 0)
    + reads.items.filter(isRead).reduce((a, i) => a + i.tokens, 0);
  const turns = msgs.filter((m) => m.role === 'user').length;
  const persona = personaLabel(d.persona);
  const webOn = !!snap.ui.webSearch[c.id];
  const streaming = store.isStreaming(c.id);
  const siblings = c.parentId ? chatsOf(g).filter((x) => x.parentId === c.parentId && x.id !== c.id) : [];
  const path = [...ancestors(g, c.id)].reverse().concat(c);
  const [copied, setCopied] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const lastLen = useRef(0);
  const streamLen = stream?.text.length ?? 0;
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const grew = msgs.length !== lastLen.current;
    lastLen.current = msgs.length;
    if (pinned.current || grew) el.scrollTop = el.scrollHeight;
  }, [msgs.length, streamLen, stream?.web, stream?.error]);

  const openSettings = (e: React.MouseEvent<HTMLElement>): void => store.openDialog({ mode: 'edit', chatId: c.id, anchor: e.currentTarget.getBoundingClientRect() });
  const reask = (i: number, e: React.MouseEvent<HTMLElement>): void => {
    let before: Message | undefined;
    for (let k = i - 1; k >= 0; k--) if (msgs[k].role === 'assistant') { before = msgs[k]; break; }
    store.openDialog({ mode: 'branch', parentId: c.id, first: msgs[i].content, forkedFromMessageId: before?.id ?? null, ...(before ? {} : { carry: 'fresh' as const, noForkPoint: true }), anchor: e.currentTarget.getBoundingClientRect() });
  };
  const copy = (m: Message): void => {
    void navigator.clipboard?.writeText(strip(renderMarkdown(m.content))).catch(() => undefined);
    setCopied(m.id);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(null), 1600);
  };
  const openMenu = (e: React.MouseEvent<HTMLElement>): void => {
    if (menuOn) { setMenuOn(false); return; }
    const r = e.currentTarget.getBoundingClientRect();
    setMenu({ top: r.bottom + 8, right: Math.max(8, innerWidth - r.right) });
    setMenuOn(true);
  };
  const toggleRow = (r: SourceRow, e: React.MouseEvent<HTMLElement>): void => {
    if (r.inherited) { store.setHidden(c.id, r.hideId, !r.hidden); return; }
    if (isChat(r.card)) { store.openFocus(r.card.id); return; }
    store.openViewer(r.card.id, null, e.currentTarget.getBoundingClientRect());
  };

  const who = (text: string): ReactElement => (
    <div className="who"><span className="av" style={{ '--c': mi.color } as CSSProperties}><i /></span>{text}</div>
  );
  const webRows = (list: Web | null | undefined): ReactElement | null => (list?.length ? (
    <div className="webrows">
      {list.map((w, i) => {
        const url = safeUrl(w.url);
        const inner = (
          <>
            <span className="tile"><Icon name="globe" /></span>
            <div><div className="q1">{w.title || host(w.url) || 'Web result'}</div><div className="q2">{host(w.url)}</div></div>
          </>
        );
        return url
          ? <a key={i} className="webrow f-web" href={url} target="_blank" rel="noopener noreferrer">{inner}</a>
          : <div key={i} className="webrow f-web">{inner}</div>;
      })}
    </div>
  ) : null);

  return (
    <>
      <aside className="panel">
        <div>
          <div className="ph">Timeline</div>
          <div className="tl">
            {path.map((s, i) => {
              const isHere = s.id === c.id, sd = chatData(s), sm = modelInfo(sd.model);
              const sr = sourceRows(g, store.readsOf(s.id).items, sd.hide ?? []);
              const asked = readRows(sr).length;
              const added = sr.filter((r) => !r.inherited);
              const head = (
                <>
                  <div className="h"><span className="mdot" style={{ '--c': sm.color } as CSSProperties} /><u>{qNum(g, s.id)}</u> · {sm.label}<span className="when">{isHere ? 'Now' : formatWhen(s.createdAt)}</span></div>
                  <div className="t">{sd.name}</div>
                  <div className="s2">Asked with {asked} source{asked === 1 ? '' : 's'}</div>
                </>
              );
              return (
                <div key={s.id} style={{ display: 'contents' }}>
                  {i > 0 && (
                    <>
                      <div className="rl"><span className="kn small" /><span className="ln" /></div>
                      <div className="ev"><Icon name="git-branch" />Branched{sd.inheritDesk === false ? ', fresh start' : ''}
                        {added.length ? <>, added<span className="sp"><Dots g={g} cards={added.map((r) => r.card)} />{added.length} source{added.length > 1 ? 's' : ''}</span></> : null}
                      </div>
                    </>
                  )}
                  {isHere ? (
                    <><div className="rl"><span className="kn now" /></div><div className="cur" aria-current="true">{head}</div></>
                  ) : (
                    <><div className="rl"><span className="kn" /><span className="ln" /></div>
                      <button type="button" className="st" data-go={s.id} onClick={() => store.openFocus(s.id)}>{head}</button></>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <div className="ph">Connected sources<span className="cnt">{read.length}</span></div>
          <div className="srows">
            {rows.length ? rows.map((r) => {
              const q = qNum(g, r.via);
              const label = nameOf(g, r.card);
              return (
                <button key={r.card.id} type="button" className={`srow f-${famOf(g, r.card)}${r.hidden ? ' off' : ''}`}
                  {...(r.inherited ? { 'data-hide': r.hideId, 'aria-pressed': !r.hidden } : { 'data-view': r.card.id })}
                  title={r.inherited ? (r.hidden ? 'Use it here again' : 'Leave it out of this chat') : 'Open'}
                  onClick={(e) => toggleRow(r, e)}>
                  <span className="tile"><Icon name={iconOf(r.card)} /></span>
                  <span className="tx"><b>{label}</b><span>{rowMeta(g, r)}</span></span>
                  <span className={`qchip${r.via === c.id ? '' : ' soft'}`}>{q}</span>
                </button>
              );
            }) : <div className="foot-note">Nothing yet. Put sources on its desk, or string one in from another question.</div>}
          </div>
          <div className="foot-note">The pill shows which question&apos;s desk a source came from. Tap an inherited one to leave it out here; tap your own to open it.</div>
        </div>
      </aside>
      <section className="main">
        <div className="mtop">
          <button type="button" className="backp" data-close onClick={() => store.closeFocus()}><Icon name="arrow-left" />Board · Esc</button>
          <span style={{ flex: 1 }} />
          <button type="button" className="backp" data-settings onClick={openSettings}><Icon name="sliders-horizontal" />Settings</button>
          <button ref={moreRef} type="button" className="backp more" data-act="more" aria-label="More" aria-haspopup="menu" aria-expanded={menuOn} onClick={openMenu}><Icon name="more-horizontal" /></button>
        </div>
        <div className="mscroll" ref={scrollRef} onScroll={(e) => { const el = e.currentTarget; pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140; }}>
          <div className="col">
            <div>
              <div className="ftitle" role="heading" aria-level={1}>{d.name}</div>
              <div className="fmeta">
                <span className="mdot" style={{ '--c': mi.color } as CSSProperties} /><b>{mi.label}</b>
                {persona ? <><span>·</span><span>{persona}</span></> : null}
                <span>·</span><span>{turns} turn{turns === 1 ? '' : 's'}</span>
                <span>·</span><span>{read.length} source{read.length === 1 ? '' : 's'}</span>
                <span>·</span><span>≈ {(total / 1000).toFixed(1)}k tokens per question</span>
              </div>
            </div>
            {msgs.map((m, i) => {
              if (m.role === 'user') {
                return (
                  <div key={m.id} className="ubw">
                    <div className="ub">{m.content}</div>
                    <button type="button" className="reask" onClick={(e) => reask(i, e)}><Icon name="git-branch" />Ask again in a new branch</button>
                  </div>
                );
              }
              const html = renderMarkdown(m.content);
              return (
                <div key={m.id} className="amsg">
                  {webRows(webMap.get(m.id))}
                  <article className="art">
                    {who(`${mi.label} answered with ${read.length} source${read.length === 1 ? '' : 's'}`)}
                    <div className="body" dangerouslySetInnerHTML={{ __html: html }} />
                    <div className="aacts">
                      <button type="button" data-copy onClick={() => copy(m)}><Icon name="copy" />{copied === m.id ? 'Copied' : 'Copy'}</button>
                      <button type="button" data-b onClick={(e) => store.openDialog({ mode: 'branch', parentId: c.id, forkedFromMessageId: m.id, anchor: e.currentTarget.getBoundingClientRect() })}>
                        <Icon name="git-branch" />Branch from here</button>
                    </div>
                  </article>
                </div>
              );
            })}
            {stream && !stream.error ? (
              <div className="amsg" key="live">
                {webRows(stream.web)}
                {stream.text ? (
                  <article className="art live" aria-busy="true">
                    {who(`${mi.label} is answering with ${read.length} source${read.length === 1 ? '' : 's'}`)}
                    <div className="body" dangerouslySetInnerHTML={{ __html: renderMarkdown(stream.text) }} />
                  </article>
                ) : (
                  <article className="art" aria-busy="true">
                    {who(`${mi.label} is thinking with ${read.length} source${read.length === 1 ? '' : 's'}…`)}
                    <div className="skel"><i style={{ width: '92%', height: 12 }} /><i style={{ width: '76%', height: 12 }} /><i style={{ width: '84%', height: 12 }} /></div>
                  </article>
                )}
              </div>
            ) : null}
            {stream?.error ? <div className="err" role="alert">{stream.error}</div> : null}
          </div>
        </div>
        <Composer key={c.id} chatId={c.id} streaming={streaming} webOn={webOn} model={mi} onSettings={openSettings} />
        <div className={`menu${menuOn ? ' on' : ''}`} data-pb="focusmenu" role="menu" inert={!menuOn} aria-hidden={!menuOn}
          style={menu ? { top: menu.top, right: menu.right, left: 'auto' } : undefined}>
          {siblings.length ? (
            <button type="button" role="menuitem" onClick={() => { setMenuOn(false); moreRef.current?.focus({ preventScroll: true }); store.openCompare(c.id); }}>
              <span className="c" style={{ background: 'var(--pb-lilac)' }}><Icon name="git-fork" /></span>Compare with siblings</button>
          ) : null}
          {d.demoted ? (
            <button type="button" role="menuitem" onClick={() => { setMenuOn(false); store.setDemoted(c.id, false); }}>
              <span className="c" style={{ background: 'var(--pb-lilac)' }}><Icon name="rotate-ccw" /></span>Bring back</button>
          ) : null}
          <button type="button" role="menuitem" onClick={() => { setMenuOn(false); store.requestDelete(c.id); }}>
            <span className="c" style={{ background: 'var(--pb-desk)' }}><Icon name="trash-2" /></span>Delete question</button>
        </div>
      </section>
    </>
  );
}

function Composer(p: {
  chatId: Id; streaming: boolean; webOn: boolean; model: { label: string; color: string };
  onSettings: (e: React.MouseEvent<HTMLElement>) => void;
}): ReactElement {
  const { store } = useBoard();
  const [text, setText] = useState('');
  const ta = useRef<HTMLTextAreaElement>(null);
  const was = useRef(p.streaming);
  const empty = !text.trim();

  // When an answer ends the box comes back and takes the cursor again.
  useEffect(() => {
    if (was.current && !p.streaming) {
      const a = document.activeElement;
      if (!a || a === document.body || a === ta.current || a.matches('[data-pb="focus"]')) ta.current?.focus({ preventScroll: true });
    }
    was.current = p.streaming;
  }, [p.streaming]);

  const resize = (): void => { const el = ta.current; if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(160, el.scrollHeight)}px`; } };
  const go = (): void => {
    const v = text.trim();
    if (!v || p.streaming) return;
    setText('');
    requestAnimationFrame(resize);
    void store.send(p.chatId, v);
  };

  return (
    <div className="fcomp">
      <div className="mfade" aria-hidden="true" />
      <div className="box">
        <textarea ref={ta} rows={1} placeholder="Ask a follow-up" aria-label="Message" value={text} disabled={p.streaming}
          onChange={(e) => { setText(e.target.value); resize(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); go(); } }} />
        <div className="row">
          <button type="button" className="cp" data-addsrc
            onClick={() => window.dispatchEvent(new CustomEvent('pb:pickfiles', { detail: { deskId: p.chatId } }))}><Icon name="plus" />Source</button>
          <button type="button" className="cp" data-settings onClick={p.onSettings}>
            <span className="mdot" style={{ '--c': p.model.color } as CSSProperties} />{p.model.label}<Icon name="chevron-down" color="var(--t2)" size={11} /></button>
          <button type="button" className={`cp${p.webOn ? ' on' : ''}`} data-web aria-pressed={p.webOn}
            onClick={() => store.setWebSearch(p.chatId, !p.webOn)}><Icon name="globe" />Web</button>
          <button type="button" className="send2" aria-label="Send" disabled={empty || p.streaming} onClick={go}><Icon name="arrow-up" /></button>
        </div>
      </div>
    </div>
  );
}
