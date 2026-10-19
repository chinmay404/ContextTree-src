/** Layout geometry ported from the prototype (lines 611-624, 666-722, 769, 1119): nothing sits on top of anything. */
import { Spring, clamp } from './spring';
import type { Box } from './camera';

export interface LayoutItem {
  id: string; isChat: boolean; isPile: boolean; deskId: string | null; w: number; h: number;
  px: Spring; py: Spring; rot: Spring; dragging?: boolean;
}
export interface Layout { items: ReadonlyMap<string, LayoutItem>; chats: string[]; rand?: () => number }

const PILE_EXTRA = 14;
const overlap = (a: Box, b: Box, g: number): boolean => a[0] < b[2] + g && a[2] + g > b[0] && a[1] < b[3] + g && a[3] + g > b[1];
/** The smallest-magnitude move that clears B from A by gap g (prototype `opts.reduce`). */
function clearance(A: Box, B: Box, g: number): [number, number] {
  const opts: [number, number][] = [[A[2] + g - B[0], 0], [-(B[2] + g - A[0]), 0], [0, A[3] + g - B[1]], [0, -(B[3] + g - A[1])]];
  return opts.reduce((a, b) => Math.hypot(...b) < Math.hypot(...a) ? b : a);
}

/** Target box; 14 taller below a pile. */
export function boxT(m: LayoutItem): Box {
  return [m.px.t, m.py.t, m.px.t + m.w, m.py.t + m.h + (m.isPile ? PILE_EXTRA : 0)];
}

export function deskMembers(l: Layout, chatId: string): LayoutItem[] {
  return [...l.items.values()].filter(m => m.deskId === chatId && !m.isChat);
}

export function deskBoxT(l: Layout, chatId: string): Box {
  const c = l.items.get(chatId)!, m = deskMembers(l, chatId);
  let x0 = c.px.t, y0 = c.py.t, x1 = c.px.t + c.w, y1 = c.py.t + c.h;
  m.forEach(s => { const b = boxT(s); x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]); });
  const P = 28;
  return [x0 - P, y0 - P - 18, Math.max(x1 + P, x0 + (m.length ? 0 : 300)), y1 + P + (m.length ? 0 : 44)];
}

/** Bounds at the current (animated) positions. */
export function deskBounds(l: Layout, chatId: string, except: LayoutItem | null = null): Box | null {
  const c = l.items.get(chatId); if (!c) return null;
  let x0 = c.px.x, y0 = c.py.x, x1 = c.px.x + c.w, y1 = c.py.x + c.h;
  const m = deskMembers(l, chatId).filter(x => x !== except);
  m.forEach(s => { x0 = Math.min(x0, s.px.x); y0 = Math.min(y0, s.py.x); x1 = Math.max(x1, s.px.x + s.w); y1 = Math.max(y1, s.py.x + s.h + (s.isPile ? PILE_EXTRA : 0)); });
  const P = 28;
  return [x0 - P, y0 - P, Math.max(x1 + P, x0 + (m.length ? 0 : 300)), y1 + P + (m.length ? 0 : 44)];
}

export function deskAt(l: Layout, x: number, y: number, except: LayoutItem | null = null): string | null {
  for (const id of l.chats) {
    const b = deskBounds(l, id, except);
    if (b && x > b[0] && x < b[2] && y > b[1] && y < b[3]) return id;
  }
  return null;
}

/** A source dropped on a chat slides to the chat's left; overlaps are nudged and cascade; chats are never shoved. */
export function makeRoom(l: Layout, n: LayoutItem): string[] {
  const G = 18, moved = new Set<string>(), rand = l.rand ?? Math.random;
  const move = (m: LayoutItem, x: number, y: number): void => { m.px.cfg(.5, .72).to(x); m.py.cfg(.5, .72).to(y); moved.add(m.id); };
  // 1. off any chat card: to its left, or its right if the source came from that side
  l.chats.forEach(cid => {
    const c = l.items.get(cid); if (!c) return;
    const A = boxT(n), C = boxT(c); if (!overlap(A, C, G)) return;
    const left = (A[0] + A[2]) / 2 <= (C[0] + C[2]) / 2 + c.w * .25;
    move(n, left ? C[0] - n.w - 28 : C[2] + 28, clamp(n.py.t, C[1] - 10, C[3] - 40));
  });
  // 2. push whatever the card now overlaps; pushed cards push their own neighbours.
  // Deviation from the prototype: pushed cards are not frozen, so two cards pushed to the same spot by one pusher
  // separate on the next pass (the 80-step guard bounds it).
  const queue = [n];
  for (let guard = 0; queue.length && guard < 80; guard++) {
    const a = queue.shift()!, A = boxT(a);
    l.items.forEach(m => {
      if (m === a || m === n || m.dragging || m.isChat) return;
      const B = boxT(m); if (!overlap(A, B, G)) return;
      const dx1 = A[2] + G - B[0], dx2 = B[2] + G - A[0], dy1 = A[3] + G - B[1], dy2 = B[3] + G - A[1];
      const pen = Math.min(dx1, dx2, dy1, dy2);
      if (pen === dy1) move(m, m.px.t, A[3] + G);
      else if (pen === dy2) move(m, m.px.t, A[1] - G - (B[3] - B[1]));
      else if (pen === dx1) move(m, A[2] + G, m.py.t);
      else move(m, A[0] - G - m.w, m.py.t);
      m.rot.kick((rand() > .5 ? 1 : -1) * 18); queue.push(m);
    });
  }
  if (n.deskId) separateDesks(l, n.deskId).forEach(id => moved.add(id));
  return [...moved];
}

export function moveDesk(l: Layout, chatId: string, dx: number, dy: number): void {
  const c = l.items.get(chatId); if (!c) return;
  [c, ...deskMembers(l, chatId)].forEach(m => { m.px.cfg(.55, .8).to(m.px.t + dx); m.py.cfg(.55, .8).to(m.py.t + dy); });
}

/** Desks never overlap: the neighbouring desk slides away whole; that can push the next one. */
export function separateDesks(l: Layout, fromChatId: string): string[] {
  if (!l.items.get(fromChatId)) return [];
  const G = 36, moved = new Set<string>(), fixed = new Set<string>([fromChatId]), fixedLoose = new Set<LayoutItem>(), queue = [fromChatId];
  for (let guard = 0; queue.length && guard < 40; guard++) {
    const id = queue.shift()!, A = deskBoxT(l, id);
    l.chats.forEach(cid => {
      const c = l.items.get(cid);
      if (fixed.has(cid) || !c || c.dragging) return;
      const B = deskBoxT(l, cid); if (!overlap(A, B, G)) return;
      const [dx, dy] = clearance(A, B, G);
      moveDesk(l, cid, dx, dy);
      moved.add(cid); deskMembers(l, cid).forEach(m => moved.add(m.id));
      fixed.add(cid); queue.push(cid);
    });
    // loose cards caught under a desk slide out with it
    l.items.forEach(s => {
      if (s.isChat || s.deskId || fixedLoose.has(s) || s.dragging) return;
      const B: Box = [s.px.t, s.py.t, s.px.t + s.w, s.py.t + s.h]; if (!overlap(A, B, 20)) return;
      const [dx, dy] = clearance(A, B, 20);
      s.px.cfg(.55, .8).to(s.px.t + dx); s.py.cfg(.55, .8).to(s.py.t + dy);
      moved.add(s.id); fixedLoose.add(s);
    });
  }
  return [...moved];
}

export function freeSpot(l: Layout, x: number, y: number, w: number, h: number): [number, number] {
  const boxes: Box[] = [...l.items.values()].map(n => [n.px.t - 50, n.py.t - 60, n.px.t + n.w + 50, n.py.t + n.h + 50]);
  l.chats.forEach(id => { const b = deskBounds(l, id); if (b) boxes.push([b[0] - 20, b[1] - 30, b[2] + 20, b[3] + 20]); });
  for (let i = 0; i < 40; i++) {
    const yy = y + i * 60;
    if (!boxes.some(b => x < b[2] && x + w > b[0] && yy < b[3] && yy + h > b[1])) return [x, yy];
  }
  return [x + 420, y];
}

export function spotOnDesk(l: Layout, chatId: string): [number, number] {
  const chat = l.items.get(chatId)!, own = deskMembers(l, chatId), x = chat.px.t - 240;
  for (let i = 0; i < 12; i++) {
    const y = chat.py.t + i * 96;
    if (!own.some(m => Math.abs(m.py.t - y) < 86 && Math.abs(m.px.t - x) < 200)) return [x, y];
  }
  return [x - 230, chat.py.t];
}

/** Where the i-th new card goes: at the drop point, on the desk, or around the view centre (world coords). */
export function placeFor(l: Layout, deskId: string | null, i: number, at: [number, number] | null, center: [number, number]): [number, number] {
  if (at) return [at[0] - 106 + i * 24, at[1] - 40 + i * 96];
  if (deskId && l.items.get(deskId)) { const [x, y] = spotOnDesk(l, deskId); return [x, y + i * 96]; }
  return [center[0] - 106 + i * 24, center[1] - 40 + i * 96];
}
