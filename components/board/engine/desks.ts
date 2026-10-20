/**
 * Desks: the soft spring-animated area behind each chat. Ported from the prototype (makeDesk 610, frame 1238-1250,
 * makeRoom 690, drag 827-832). Geometry (bounds, make-room, separation) lives in geometry.ts.
 */
import type { Id } from '../api/types';
import { FAMC } from '../lib/catalog';
import { esc } from '../lib/format';
import { chatData, deskOf, famOf } from '../lib/graph';
import { deskAt as geoDeskAt, deskBounds, makeRoom, separateDesks } from './geometry';
import type { Spring } from './spring';
import type { DesksModule, EngineContext, ViewNode } from './types';

interface Desk { chat: Id; el: HTMLDivElement; tab: HTMLDivElement; b: Spring[]; init: boolean }

export function createDesks(ctx: EngineContext): DesksModule {
  const desks = new Map<Id, Desk>();

  function make(chat: Id): void {
    const el = document.createElement('div'); el.className = 'desk'; el.dataset.chat = chat;
    const tab = document.createElement('div'); tab.className = 'tab'; el.append(tab);
    ctx.world.insertBefore(el, ctx.world.firstChild);
    desks.set(chat, { chat, el, tab, b: [0, 0, 0, 0].map(() => ctx.springs.make(0, .5, .55)), init: false });
  }

  function drop(d: Desk): void { d.el.remove(); d.b.forEach((s) => ctx.springs.remove(s)); desks.delete(d.chat); }

  /** Chats that moved because of a drop wiggle a little, as in the prototype. */
  function jiggled(moved: string[]): void {
    for (const id of moved) if (ctx.nodes.get(id)?.isChat) ctx.jiggle(id, .25);
  }

  return {
    sync() {
      const live = new Set(ctx.layout().chats);
      for (const id of live) if (!desks.has(id)) make(id);
      for (const d of [...desks.values()]) if (!live.has(d.chat)) drop(d);
    },

    frame(z) {
      const layout = ctx.layout(), g = ctx.store.graph();
      let dragged: ViewNode | null = null;
      for (const n of ctx.nodes.values()) if (n.dragging && !n.isChat) { dragged = n; break; }
      desks.forEach((d) => {
        const c = g.cards.get(d.chat), box = deskBounds(layout, d.chat, dragged && dragged.deskId === d.chat ? dragged : null);
        if (!c || !box) { d.el.style.display = 'none'; return; }
        d.el.style.display = '';
        if (!d.init) { d.b.forEach((s, i) => s.snap(box[i])); d.init = true; } else d.b.forEach((s, i) => s.to(box[i]));
        const dw = d.b[2].x - d.b[0].x;
        d.el.style.transform = `translate3d(${d.b[0].x}px,${d.b[1].x}px,0)`;
        d.el.style.width = dw + 'px'; d.el.style.height = (d.b[3].x - d.b[1].x) + 'px';
        const own = deskOf(g, d.chat);
        d.el.classList.toggle('empty', !own.length);
        const key = chatData(c).name + own.map((m) => m.id + famOf(g, m) + m.status).join();
        if (d.tab.dataset.v !== key) {
          d.tab.dataset.v = key;
          const dots = own.slice(0, 6).map((m) => {
            const col = FAMC[famOf(g, m)][1];
            return `<i${m.status === 'soon' ? ' class="soon"' : ''} style="background:${esc(col)};--dc:${esc(col)}"></i>`;
          }).join('');
          d.tab.innerHTML = `<span class="lb">${esc(chatData(c).name)}</span>${own.length ? `<span class="dots">${dots}</span>` : ''}`;
        }
        // zoomed out, the name grows so the board reads as a map; below 55% it holds ~10-15px on screen and never outgrows its desk
        const want = z >= .55 ? 0 : 10 + (.55 - z) * 16, ts = Math.max(1, want / (12 * z));
        d.tab.style.transform = ts > 1.01 ? `scale(${ts.toFixed(3)})` : '';
        d.tab.style.maxWidth = Math.max(120, (dw - 40) / ts) + 'px';
      });
    },

    deskAt: (x, y, except) => geoDeskAt(ctx.layout(), x, y, except ?? null),
    setHot(chatId) { desks.forEach((d) => d.el.classList.toggle('hot', d.chat === chatId)); },
    onCardDropped(n) { jiggled(makeRoom(ctx.layout(), n)); },
    onChatDropped(n) { jiggled(separateDesks(ctx.layout(), n.id)); },
    fade(related) { desks.forEach((d) => d.el.classList.toggle('faded', !!related && !related.has(d.chat))); },
    deskBox: (chatId) => deskBounds(ctx.layout(), chatId),
    dispose() { [...desks.values()].forEach(drop); },
  };
}

