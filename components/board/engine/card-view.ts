/**
 * Card faces and their bindings, ported from the prototype's render / srcHTML / chatHTML / tileHTML / metaOf / bind / act
 * (lines 455-565). Every interpolated value goes through esc(); answers go through renderMarkdown.
 */
import type { Card, ChatData, Id, Message, ProviderId, SourceData } from '../api/types';
import { FAMC, TYPE_INFO, modelInfo, personaLabel } from '../lib/catalog';
import { colorOf } from '../lib/colors';
import { keyErrorView } from '../lib/key-errors';
import { modelMarkHtml } from '../lib/model-icons';
import { cut, esc } from '../lib/format';
import { answersInto, chatData, iconOf, edgesFrom, famOf, isChat, kids, membersOf, nameOf, qNum, sourceData, wiresInto, type Graph } from '../lib/graph';
import { renderMarkdown } from '../lib/markdown';
import { webRowHTML } from '../lib/web-results';
import { countSources, foldPiles, isRead, tokensRead } from '../lib/reads';
import { icon } from './icons';
import type { BoardStore } from '../store';
import type { EngineContext, ViewNode } from './types';

export const CHAT_W = 320, SRC_W = 212, CHAT_W_S = 260, SRC_W_S = 220;

/** Engine services the card faces need beyond the shared context. */
export interface CardViewHooks {
  related(): Set<Id> | null;
  bindTips(root: HTMLElement): void;
  focusCompose(id: Id): void; focusNote(id: Id): void; focusDesc(id: Id): void;
}

/**
 * "Source changed": a source the chat reads had its content (note/doc text) edited after the chat's last answer,
 * as the prototype's changedAt. Desc edits, excerpt toggles and desk moves never count.
 */
export function chatStale(store: BoardStore, chatId: Id): boolean {
  const msgs = store.getSnapshot().messages.get(chatId) ?? [];
  const lastA = [...msgs].reverse().find((x) => x.role === 'assistant');
  if (!lastA) return false;
  const at = Date.parse(lastA.createdAt), g = store.graph();
  return store.readsOf(chatId).items.filter(isRead).some((i) => {
    const c = g.cards.get(i.cardId);
    const t = c && !isChat(c) ? sourceData(c).textChangedAt : undefined;
    return !!t && Date.parse(t) > at;
  });
}

const dotsHTML = (g: Graph, list: Card[]): string =>
  `<span class="dots">${list.slice(0, 6).map((c) => `<i style="background:${FAMC[famOf(g, c)][1]}"></i>`).join('')}</span>`;

const wireCount = (g: Graph, id: Id): number => edgesFrom(g, id).filter((e) => e.kind === 'wire').length;

export class CardView {
  constructor(private readonly ctx: EngineContext, private readonly hooks: CardViewHooks) {}

  private get g(): Graph { return this.ctx.store.graph(); }

  // ---- faces ----

  private tileHTML(n: ViewNode, c: Card, big = false): string {
    const g = this.g;
    if (c.status === 'failed') return `<div class="tile">${icon('triangle-alert')}</div>`;
    if (c.status === 'processing') return '<div class="tile"></div>';
    if (c.sourceType === 'pile' && !big) {
      const ms = membersOf(g, c.id), f = ms.length ? ms[this.ctx.modules.piles.front(c.id) % ms.length] : null;
      return `<div class="tile">${icon(TYPE_INFO[f?.sourceType ?? 'pdf'].icon)}<span class="badge">${ms.length}</span></div>`;
    }
    const d = sourceData(c);
    if (c.sourceType === 'image') { const u = this.ctx.store.fileUrl(c.id); if (u) return `<div class="tile"><img src="${esc(u)}" alt=""></div>`; }
    if (c.sourceType === 'video' && d.ytid) return `<div class="tile"><img src="https://i.ytimg.com/vi/${esc(encodeURIComponent(d.ytid))}/mqdefault.jpg" alt=""></div>`;
    void n;
    return `<div class="tile">${icon(iconOf(c))}</div>`;
  }

  /** The engine's figure for the chat that is selected or open; no figure when that chat does not read the card. */
  private tokensText(c: Card): string | null {
    const ui = this.ctx.store.getSnapshot().ui, g = this.g;
    const sel = ui.selected ? g.cards.get(ui.selected) : undefined;
    const chat = ui.focus ?? (sel && isChat(sel) ? sel.id : null);
    const t = chat ? tokensRead(g, this.ctx.store.engineReads(chat)?.items ?? [], c) : null;   // engine figures only, never the mock estimate
    return t === null ? null : `${(t / 1000).toFixed(1)}k tokens`;
  }

  private tokensPill(c: Card): string {
    const t = this.tokensText(c);
    return t === null ? '' : `<span class="upill tk">${t}</span>`;
  }

  /** Read state changed (reads arrived, a chat started or stopped answering): update classes and the figure without redrawing the face. */
  refreshLive(n: ViewNode): void {
    const c = this.g.cards.get(n.id);
    if (!c) return;
    const cls = this.classes(n, c);
    if (n.el.className !== cls) n.el.className = cls;
    this.refreshTokens(n);
  }

  /** The figure follows the selected chat: change it in place, so a click that is landing on the open card is not lost to a redraw. */
  refreshTokens(n: ViewNode): void {
    const c = this.g.cards.get(n.id), foot = n.el.querySelector('.lfoot');
    if (!c || !foot) return;
    const t = this.tokensText(c), cur = foot.querySelector('.tk');
    if (t === null) cur?.remove();
    else if (cur) cur.textContent = t;
    else { const pill = document.createElement('span'); pill.className = 'upill tk'; pill.textContent = t; foot.querySelector('.done')?.before(pill); }
  }

  private metaOf(n: ViewNode, c: Card): string {
    const g = this.g, d = sourceData(c);
    if (c.status === 'processing') return 'Reading…';
    if (c.status === 'failed') return "Couldn't read";
    let base = d.meta ?? TYPE_INFO[c.sourceType ?? 'pdf'].label;
    if (c.sourceType === 'pile') {
      const ms = membersOf(g, c.id), N = ms.length || 1;
      base = `${ms.every((m) => m.sourceType === 'pdf') ? 'PDF' : 'Mixed'} · ${n.open ? `${ms.length} files` : `${(this.ctx.modules.piles.front(c.id) % N) + 1} of ${ms.length}`}`;
    }
    const w = wireCount(g, c.id);
    return esc(base) + (w ? ` · ${icon('link')} ${w + (c.deskId ? 1 : 0)} chats` : '');
  }

  private srcHTML(n: ViewNode, c: Card): string {
    const g = this.g, d = sourceData(c), pile = c.sourceType === 'pile', st = c.status ?? 'ready';
    const sheets = pile ? '<div class="sheet s2"></div><div class="sheet s1"></div>' : '';
    // zoomed out: a plain coloured pebble; the desk names carry the words (map view)
    if (this.ctx.size() === 'S') return `${sheets}<div class="face" title="${esc(nameOf(g, c))}"><div class="s blob"></div></div>`;
    const live = st === 'ready' || st === 'soon';
    const port = live ? `<span class="port out ${wireCount(g, c.id) ? '' : 'free'}" data-port="src" data-tip="Drag onto a chat to connect"></span>` : '';
    const ic = (a: string, ico: string, tip: string) => `<button class="ic" data-act="${a}" data-tip="${esc(tip)}" aria-label="${esc(tip)}">${icon(ico)}</button>`;
    const tools = `<div class="tools">${live ? ic('view', 'maximize-2', 'Open · double-click') : ''}${c.sourceType !== 'note' && st === 'ready' ? ic('expand', n.open ? 'chevrons-down-up' : 'chevrons-up-down', n.open ? 'Done' : 'Excerpts and what it is for') : ''}${pile ? ic('unstack', 'ungroup', 'Unpile') : ''}${ic('del', 'x', 'Remove')}</div>`;
    const soon = st === 'soon' ? '<span class="soon-pill">Coming soon</span>' : '';
    const ex = d.excerpts ?? [];
    let body: string;
    if (c.sourceType === 'note') {
      body = `<div class="note-in"><div class="meta">${esc(d.meta || 'Note · You')}</div><div class="n" contenteditable="true" spellcheck="false">${esc(d.text ?? '')}</div></div>`;
    } else if (n.open && st === 'ready') {
      const ms = pile ? membersOf(g, c.id) : [];
      const list = pile
        ? ms.map((m, i) => `<button data-mem="${i}" class="${sourceData(m).off ? 'off' : ''}"><span class="chipl">${String(i + 1).padStart(2, '0')}</span><span>${esc(sourceData(m).title ?? 'Untitled')}</span></button>`).join('')
        : ex.map((e, i) => `<button data-ex="${i}" class="${e.on ? '' : 'off'}">${e.loc ? `<span class="chipl">${esc(e.loc)}</span>` : ''}<span>${esc(e.text)}</span></button>`).join('');
      const tot = pile ? ms.length : ex.length, used = pile ? ms.filter((m) => !sourceData(m).off).length : ex.filter((e) => e.on).length;
      body = `<div class="l"><div class="top">${this.tileHTML(n, c)}<div class="sx"><div class="meta">${this.metaOf(n, c)}</div><div class="ttl">${esc(d.title ?? 'Untitled')}</div></div></div>
      ${list ? `<div class="exl">${list}</div>` : ''}
      <textarea class="desc" rows="2" placeholder="What is this for? The AI reads this too.">${esc(d.desc ?? '')}</textarea>
      <div class="lfoot">${tot ? `<span class="upill">${used} of ${tot} used</span>` : ''}${this.tokensPill(c)}<button class="done" data-act="expand">Done</button></div></div>`;
    } else if (pile && st === 'ready') {
      const ms = membersOf(g, c.id), f = ms.length ? ms[this.ctx.modules.piles.front(c.id) % ms.length] : null;
      const fd = f ? sourceData(f) : {}, e = (fd.excerpts ?? [])[0];
      body = `<div class="sn" title="Scroll to flip through the pile">${this.tileHTML(n, c)}<div class="sx"><div class="meta">${this.metaOf(n, c)}</div><div class="ttl">${esc(fd.title ?? d.title ?? 'Pile')}</div>${e ? `<div class="exr">${e.loc ? `<span class="chipl">${esc(e.loc)}</span>` : ''}<span>${esc(e.text)}</span></div>` : ''}</div></div>`;
    } else {
      const e = ex.find((x) => x.on) ?? ex[0];
      const line = st === 'processing' ? '<div class="prog"><i></i></div>'
        : st === 'failed' ? `<div class="fix">${d.error ? `${esc(d.error)}<br>` : ''}<button data-retry>Retry</button> · <button data-pastetext>Paste text</button></div>`
        : c.sourceType === 'doc' ? `<div class="exr"><span>${esc(cut(d.text || 'Empty document', 90))}</span></div>`
        : e ? `<div class="exr">${e.loc ? `<span class="chipl">${esc(e.loc)}</span>` : ''}<span>${esc(e.text)}</span></div>` : '';
      const desc = live ? (d.desc ? `<div class="dsc">“${esc(d.desc)}”</div>` : n.fresh && st === 'ready' ? `<button class="ask-desc" data-act="describe">Say what it's for</button>` : '') : '';
      body = `<div class="sn">${this.tileHTML(n, c)}<div class="sx"><div class="meta">${this.metaOf(n, c)}</div><div class="ttl">${esc(d.title || 'Untitled')}</div>${line}${desc}${soon}</div></div>`;
    }
    return `${sheets}<div class="face">${body}${tools}${port}</div>`;
  }

  /** What the footer of a chat shows: one dot per source, the counts, and "Source changed". */
  private footInner(c: Card): string {
    const g = this.g, store = this.ctx.store;
    const read = store.readsOf(c.id).items.filter(isRead);
    const own = countSources(g, read, false), up = countSources(g, read, true);
    const readCards = read.map((i) => g.cards.get(i.cardId)).filter((x): x is Card => !!x);
    const stale = chatStale(store, c.id);
    return `${readCards.length ? dotsHTML(g, foldPiles(g, readCards)) : ''}<span>${own} source${own === 1 ? '' : 's'}${up ? ` · ${up} from above` : ''}</span><span class="sp"></span>${stale ? '<span class="stale">Source changed</span>' : ''}`;
  }

  /** Reads changed: the footer, the thinking line, the ports and the class name follow, without a redraw that would eat a click. */
  refreshChatFoot(n: ViewNode): void {
    const c = this.g.cards.get(n.id);
    if (!c) return;
    const cls = this.classes(n, c);
    if (n.el.className !== cls) n.el.className = cls;
    const foot = n.el.querySelector('.cfoot');
    if (!foot) return;   // zoomed-out or demoted face: nothing to update
    const html = this.footInner(c);
    if (foot.innerHTML !== html) foot.innerHTML = html;
    const g = this.g;
    const incoming = !!c.parentId || answersInto(g, c.id).length > 0 || wiresInto(g, c.id).length > 0;
    const outgoing = kids(g, c.id).length > 0 || edgesFrom(g, c.id).some((e) => e.kind === 'answer');
    n.el.querySelector('.port.in')?.classList.toggle('free', !incoming);
    n.el.querySelector('.port.out[data-port="chat"]')?.classList.toggle('free', !outgoing);
    const th = n.el.querySelector('.thinking');
    if (th) { const k = countSources(g, this.ctx.store.readsOf(c.id).items.filter(isRead)); th.lastChild!.textContent = `Thinking with ${k} source${k === 1 ? '' : 's'}…`; }
  }

  private chatHTML(_n: ViewNode, c: Card): string {
    const g = this.g, d = chatData(c), store = this.ctx.store, m = modelInfo(d.model);
    if (this.ctx.size() === 'S' || d.demoted) return `<div class="face" title="${esc(d.name)}"><div class="s blob">${modelMarkHtml(m)}</div></div>`;
    const items = store.readsOf(c.id).items, read = items.filter(isRead);
    const nRead = countSources(g, read);
    const snap = store.getSnapshot(), msgs: Message[] = snap.messages.get(c.id) ?? [], stream = snap.streaming.get(c.id);
    const streaming = store.isStreaming(c.id);
    const body = msgs.map((x) => x.role === 'user' ? `<div class="qb">${esc(x.content)}</div>` : x.content ? `<div class="ans">${renderMarkdown(x.content)}</div>` : '').join('');
    let live = '';
    if (stream?.error) {
      const ke = keyErrorView(stream, m, !!this.ctx.openSettings);
      live = ke
        ? `<p class="err keyerr" data-code="${esc(stream.code ?? '')}">${esc(ke.text)}${ke.action ? ` <button class="apill" data-act="${ke.action}" data-provider="${esc(ke.provider ?? '')}">${esc(ke.button ?? '')}</button>` : ''}</p>`
        : `<p class="err">${esc(stream.error)}</p>`;
    }
    else if (stream && stream.text) live = `<div class="ans live">${renderMarkdown(stream.text)}</div>`;
    else if (streaming) live = `<div class="thinking"><i></i>Thinking with ${nRead} source${nRead === 1 ? '' : 's'}…</div><div class="skel"><i style="width:92%"></i><i style="width:76%"></i><i style="width:84%"></i></div>`;
    if (stream?.web?.length) live = webRowHTML(stream.web, stream.webQuery, true) + live;
    const ap = (a: string, ico: string, label: string) => `<button class="apill" data-act="${a}">${icon(ico)}${label}</button>`;
    const incoming = !!c.parentId || answersInto(g, c.id).length > 0 || wiresInto(g, c.id).length > 0;
    const outgoing = kids(g, c.id).length > 0 || edgesFrom(g, c.id).some((e) => e.kind === 'answer');
    const persona = personaLabel(d.persona);
    const hasMsgs = msgs.length > 0 || (c.messageCount ?? 0) > 0;
    return `<div class="face">
    <div class="chd">${modelMarkHtml(m)}<span class="mtag" title="${esc(qNum(g, c.id))} · ${esc(m.name)}"><u>${esc(qNum(g, c.id))}</u> · ${esc(m.name)}</span><span class="sp"></span>${streaming ? '' : `${ap('open', 'maximize-2', 'Open')}${ap('branch', 'git-branch', 'Branch')}`}</div>
    <div class="ttl">${esc(d.name)}${persona ? ` <span class="ptag">${esc(persona)}</span>` : ''}</div>
    ${body || live ? `<div class="cbody">${body}${live}</div>` : ''}
    <div class="compose"><textarea rows="1" placeholder="${hasMsgs ? 'Ask a follow-up' : 'Type the question you want to ask…'}" aria-label="Message"></textarea><button class="send" aria-label="Send" disabled>${icon('arrow-up')}</button></div>
    <div class="cfoot">${this.footInner(c)}</div>
    <span class="port in ${incoming ? '' : 'free'}" aria-hidden="true"></span>
    <span class="port out ${outgoing ? '' : 'free'}" data-port="chat" data-tip="Drag out to branch · onto a chat to share this answer"></span>
  </div>`;
  }

  // ---- classes ----

  /** True when a streaming chat reads this source (or a member of this pile). */
  private reading(c: Card): boolean {
    const g = this.g, store = this.ctx.store;
    for (const ch of g.cards.values()) {
      if (ch.kind !== 'chat' || !store.isStreaming(ch.id)) continue;
      if (store.readsOf(ch.id).items.some((i) => isRead(i) && (i.cardId === c.id || g.cards.get(i.cardId)?.pileId === c.id))) return true;
    }
    return false;
  }

  classes(n: ViewNode, c: Card): string {
    const g = this.g, chat = isChat(c), sel = this.ctx.store.getSnapshot().ui.selected, rel = this.hooks.related();
    const st = c.status ?? 'ready';
    const loose = !chat && !c.deskId && wireCount(g, c.id) === 0;
    const msgs = this.ctx.store.getSnapshot().messages.get(c.id);
    const empty = chat && !(msgs?.length) && !(c.messageCount ?? 0) && !this.ctx.store.isStreaming(c.id);
    const keep = ['lift', 'drop', 'target'].filter((k) => n.el.classList.contains(k));
    return ['card', chat ? 'chat' : `src f-${famOf(g, c)}`, `size-${this.ctx.size().toLowerCase()}`, c.id === sel && 'selected',
      !!rel && !rel.has(c.id) && 'faded', empty && 'empty', !chat && this.reading(c) && 'reading', !chat && st !== 'ready' && st,
      loose && (st === 'ready' || st === 'soon') && 'muted', chat && (c.data as ChatData).demoted && 'demoted', colorOf(c.data) && `tone-${colorOf(c.data)}`, ...keep]
      .filter(Boolean).join(' ');
  }

  // ---- render ----

  render(n: ViewNode): void {
    const c = this.ctx.store.graph().cards.get(n.id);
    if (!c) return;
    const el = n.el, active = document.activeElement;
    const nt0 = el.querySelector<HTMLElement>('.note-in .n');
    if (nt0 && nt0 === active) return;   // never re-render a note while typing in it
    const ta = el.querySelector<HTMLTextAreaElement>('.compose textarea');
    const focus = !!ta && ta === active, draft = ta?.value ?? '', taSel = ta ? [ta.selectionStart, ta.selectionEnd] : null;
    const dta = el.querySelector<HTMLTextAreaElement>('.desc'), dFocus = !!dta && dta === active, dSel = dta ? [dta.selectionStart, dta.selectionEnd] : null;
    const sc = el.querySelector('.cbody')?.scrollTop, nsc = nt0?.scrollTop;
    const chat = isChat(c), S = this.ctx.size() === 'S';
    el.className = this.classes(n, c);
    el.style.width = (S ? (chat ? CHAT_W_S : SRC_W_S) : chat ? CHAT_W : SRC_W) + 'px';
    el.innerHTML = chat ? this.chatHTML(n, c) : this.srcHTML(n, c);
    this.bind(n, c);
    const b = el.querySelector('.cbody');
    if (b) { b.scrollTop = sc ?? (this.ctx.store.isStreaming(c.id) ? b.scrollHeight : 0); b.classList.toggle('short', b.scrollHeight <= b.clientHeight + 2); }
    // a long note scrolls inside its card, so the card (and its port) stays a reachable size
    const nb = el.querySelector<HTMLElement>('.note-in .n');
    if (nb) { nb.scrollTop = nsc ?? 0; nb.classList.toggle('short', nb.scrollHeight <= nb.clientHeight + 2); }
    const nt = el.querySelector<HTMLTextAreaElement>('.compose textarea');
    if (nt) {
      nt.value = draft;
      if (focus) { nt.focus({ preventScroll: true }); if (taSel) nt.setSelectionRange(taSel[0] ?? draft.length, taSel[1] ?? draft.length); }
      nt.dispatchEvent(new Event('input'));
    }
    if (dFocus) {
      const d2 = el.querySelector<HTMLTextAreaElement>('.desc');
      if (d2) { d2.focus({ preventScroll: true }); const L = d2.value.length; d2.setSelectionRange(Math.min(dSel?.[0] ?? L, L), Math.min(dSel?.[1] ?? L, L)); }
    }
    n.h = el.offsetHeight;
  }

  /** A later stream delta only touches `.ans.live` (prototype stream(), 877-883). False when a full render is needed. */
  updateStream(n: ViewNode): boolean {
    const s = this.ctx.store.getSnapshot().streaming.get(n.id);
    const el = n.el.querySelector('.ans.live');
    if (!s || s.error || !s.text || !el || this.ctx.size() === 'S') return false;
    el.innerHTML = renderMarkdown(s.text);
    const b = n.el.querySelector('.cbody');
    if (b) { b.scrollTop = b.scrollHeight; b.classList.remove('short'); }
    return true;
  }

  // ---- bindings ----

  private bind(n: ViewNode, c: Card): void {
    const { store } = this.ctx, el = n.el, id = n.id;
    const ta = el.querySelector<HTMLTextAreaElement>('.compose textarea');
    if (ta) {
      const sb = el.querySelector<HTMLButtonElement>('.send')!;
      ta.addEventListener('input', () => {
        sb.disabled = !ta.value.trim() || store.isStreaming(id);
        ta.style.height = 'auto'; ta.style.height = Math.min(110, ta.scrollHeight) + 'px';
      });
      const go = () => { const v = ta.value.trim(); if (!v || store.isStreaming(id)) return; ta.value = ''; void store.send(id, v); };
      ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } });
      sb.addEventListener('click', go);
    }
    el.querySelectorAll<HTMLElement>('[data-act]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); this.act(n, b.dataset.act!, b); }));
    el.querySelectorAll<HTMLElement>('[data-ex]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const i = +b.dataset.ex!, x = (sourceData(c).excerpts ?? [])[i];
      if (x) store.setExcerpt(id, i, !x.on);
    }));
    el.querySelectorAll<HTMLElement>('[data-mem]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const m = membersOf(store.graph(), id)[+b.dataset.mem!];
      if (m) store.setMemberOff(m.id, !sourceData(m).off);
    }));
    el.querySelector('[data-retry]')?.addEventListener('click', (e) => { e.stopPropagation(); store.retrySource(id); });
    el.querySelector('[data-pastetext]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const nid = store.replaceWithNote(id);
      store.select(nid); this.hooks.focusNote(nid);
    });
    const note = el.querySelector<HTMLElement>('.note-in .n');
    if (note) {
      note.addEventListener('input', () => {
        note.classList.toggle('short', note.scrollHeight <= note.clientHeight + 2);
        store.patchDataDebounced(id, { text: note.textContent ?? '' } as Partial<SourceData>);
      });
      // Pressing one of the card's own buttons blurs the note first; re-rendering then would swap the button out before its click.
      let onButton = false;
      note.closest('.face')?.addEventListener('pointerdown', (e) => { onButton = e.target instanceof Element && !!e.target.closest('button'); }, true);
      note.addEventListener('blur', () => { if (!onButton) this.render(n); onButton = false; });
    }
    const desc = el.querySelector<HTMLTextAreaElement>('.desc');
    if (desc) desc.addEventListener('input', () => { n.fresh = false; store.patchDataDebounced(id, { desc: desc.value } as Partial<SourceData>); });
    this.hooks.bindTips(el);
  }

  private act(n: ViewNode, a: string, btn: HTMLElement): void {
    const { store } = this.ctx, id = n.id;
    if (a === 'addkey' || a === 'fixkey') { const p = btn.dataset.provider as ProviderId | undefined; if (p) this.ctx.openSettings?.(p); return; }
    if (a === 'open') store.openFocus(id);
    if (a === 'view') store.openViewer(id, null, btn.getBoundingClientRect());
    if (a === 'branch') store.openDialog({ mode: 'branch', parentId: id, anchor: btn.getBoundingClientRect() });
    if (a === 'expand' || a === 'describe') {
      n.open = a === 'describe' ? true : !n.open; n.fresh = false;
      n.el.style.zIndex = String(this.ctx.nextZ()); this.render(n); this.ctx.jiggle(id, .6);
      if (a === 'describe') this.hooks.focusDesc(id);
    }
    if (a === 'unstack') this.ctx.modules.piles.unstack(id);
    if (a === 'del') store.requestDelete(id);
  }
}
