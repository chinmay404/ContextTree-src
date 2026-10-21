import { FAMC, STRING_COL, TYPE_INFO, type Family } from '@/components/board/lib/catalog';
import type { Id } from '@/components/board/api/types';
import type { BoardPreview, BoardPreviewCard } from './preview-types';

/** Card sizes on the board (CHAT_W / SRC_W in engine/card-view.ts; a chat is about 220 tall, a source 90). */
export const MAP_SIZE = { chatW: 320, chatH: 220, srcW: 212, srcH: 90, pileExtra: 14 } as const;
/** Lineage strings use the board's edge grey (--pb-edge). */
export const LINEAGE_COLOR = '#D2D2D7';

export interface MapDesk { chatId: Id; x: number; y: number; w: number; h: number; label: string }
export interface MapPebble { id: Id; kind: 'chat' | 'source'; x: number; y: number; w: number; h: number; fill: string; rim: string }
export interface MapString { d: string; color: string }
export interface MapGeometry { box: [number, number, number, number]; desks: MapDesk[]; pebbles: MapPebble[]; strings: MapString[] }

const DESK_PAD = 28;
const EMPTY_ID = '__empty__';

const sizeOf = (c: BoardPreviewCard): [number, number] =>
  c.kind === 'chat'
    ? [MAP_SIZE.chatW, MAP_SIZE.chatH]
    : [MAP_SIZE.srcW, MAP_SIZE.srcH + (c.sourceType === 'pile' ? MAP_SIZE.pileExtra : 0)];

const familyOf = (c: BoardPreviewCard): Family => (c.sourceType ? TYPE_INFO[c.sourceType]?.family ?? 'mixed' : 'mixed');

const curve = (x1: number, y1: number, x2: number, y2: number): string => {
  const dx = Math.max(60, Math.abs(x2 - x1) * 0.5);
  return `M${x1} ${y1} C${x1 + dx} ${y1 + 20}, ${x2 - dx} ${y2 + 20}, ${x2} ${y2}`;
};

/** Truncates a desk label to `maxPx` at 6.3 px per character, keeping at least three characters. */
export function fitLabel(label: string, maxPx: number): string {
  if (label.length * 6.3 <= maxPx) return label;
  return label.slice(0, Math.max(3, Math.floor(maxPx / 6.3) - 1)) + '…';
}

/** Desks, pebbles and strings for a board preview, in board coordinates. A missing or empty preview is one empty desk. */
export function mapGeometry(preview: BoardPreview | undefined, opts: { pad?: number; title?: string } = {}): MapGeometry {
  const pad = opts.pad ?? 70;
  const cards: BoardPreviewCard[] = preview?.cards?.length
    ? preview.cards
    : [{ id: EMPTY_ID, kind: 'chat', sourceType: null, x: 0, y: 0, deskId: null, pileId: null, parentId: null, name: opts.title || 'Untitled board' }];
  const edges = preview?.cards?.length ? preview.edges ?? [] : [];
  const byId = new Map(cards.map((c) => [c.id, c]));

  const desks: MapDesk[] = cards
    .filter((c) => c.kind === 'chat')
    .map((c) => {
      const members = cards.filter((m) => m.kind === 'source' && m.deskId === c.id && !m.pileId);
      let x0 = c.x, y0 = c.y, x1 = c.x + MAP_SIZE.chatW, y1 = c.y + MAP_SIZE.chatH;
      for (const m of members) {
        const [w, h] = sizeOf(m);
        x0 = Math.min(x0, m.x); y0 = Math.min(y0, m.y); x1 = Math.max(x1, m.x + w); y1 = Math.max(y1, m.y + h);
      }
      const left = x0 - DESK_PAD, top = y0 - DESK_PAD - 18;
      const right = Math.max(x1 + DESK_PAD, x0 + (members.length ? 0 : 300));
      const bottom = y1 + DESK_PAD + (members.length ? 0 : 44);
      return { chatId: c.id, x: left, y: top, w: right - left, h: bottom - top, label: c.name || 'Untitled' };
    });

  const pebbles: MapPebble[] = cards.map((c) => {
    const [w, h] = sizeOf(c);
    if (c.kind === 'chat') return { id: c.id, kind: 'chat', x: c.x, y: c.y, w, h, fill: '#FFFFFF', rim: '#D2D2D7' };
    const [fill, rim] = FAMC[familyOf(c)];
    return { id: c.id, kind: 'source', x: c.x, y: c.y, w, h, fill, rim };
  });

  const strings: MapString[] = [];
  for (const c of cards) {
    const parent = c.kind === 'chat' && c.parentId ? byId.get(c.parentId) : undefined;
    if (parent) strings.push({ d: curve(parent.x + MAP_SIZE.chatW, parent.y + 22, c.x, c.y + 40), color: LINEAGE_COLOR });
  }
  for (const e of edges) {
    const from = byId.get(e.from), to = byId.get(e.to);
    if (!from || !to) continue;
    if (e.kind === 'wire' && from.kind === 'source' && to.kind === 'chat') {
      const [w, h] = sizeOf(from);
      strings.push({ d: curve(from.x + w, from.y + h / 2, to.x, to.y + 40), color: STRING_COL[familyOf(from)] });
    } else if (e.kind === 'answer') {
      strings.push({ d: curve(from.x + MAP_SIZE.chatW, from.y + 22, to.x, to.y + 40), color: STRING_COL.answer });
    }
  }

  const xs = desks.map((d) => d.x).concat(pebbles.map((p) => p.x));
  const ys = desks.map((d) => d.y).concat(pebbles.map((p) => p.y));
  const xe = desks.map((d) => d.x + d.w).concat(pebbles.map((p) => p.x + p.w));
  const ye = desks.map((d) => d.y + d.h).concat(pebbles.map((p) => p.y + p.h));
  const bx = Math.min(...xs) - pad, by = Math.min(...ys) - pad;
  return { box: [bx, by, Math.max(...xe) + pad - bx, Math.max(...ye) + pad - by], desks, pebbles, strings };
}
