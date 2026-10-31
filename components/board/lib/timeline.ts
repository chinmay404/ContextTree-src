import { ancestors, chatsOf, kids, type Graph } from './graph';
import type { Id } from '../api/types';

/** The focus view's timeline: every root question is a section, its branches hang off it as a tree. */
export interface TimelineRow { id: Id; depth: number; /** index in `rows`, -1 = the section's head */ parentRow: number; onPath: boolean; here: boolean }
export interface TimelineSection { rootId: Id; /** the current chat is in this family */ here: boolean; rows: TimelineRow[] }

export const ROW_H = 36;
const PAD = 6, RADIUS = 8, ICON_GAP = 11, MAX_DEPTH = 5;

/** x of the icon of a row at this depth, and of the line its own branches leave along. */
export const lineX = (depth: number): number => 12 + 22 * Math.min(depth, MAX_DEPTH);
export const rowY = (k: number): number => PAD + k * ROW_H + ROW_H / 2;
export const treeHeight = (n: number): number => (n ? PAD * 2 + n * ROW_H : 0);

/** One branch: down the parent's line, round the corner, along to just before the row's icon. */
export function branchPath(row: Pick<TimelineRow, 'depth' | 'parentRow'>, k: number): string {
  const x = lineX(Math.min(row.depth, MAX_DEPTH) - 1), y = rowY(k);
  const top = row.parentRow < 0 ? 0 : rowY(row.parentRow) + ICON_GAP;
  return `M ${x} ${top} V ${y - RADIUS} A ${RADIUS} ${RADIUS} 0 0 0 ${x + RADIUS} ${y} H ${lineX(row.depth) - ICON_GAP}`;
}

export function timelineSections(g: Graph, chatId: Id): TimelineSection[] {
  const path = new Set<Id>([chatId, ...ancestors(g, chatId).map((c) => c.id)]);
  return chatsOf(g).filter((c) => !c.parentId || !g.cards.has(c.parentId)).map((root) => {
    const rows: TimelineRow[] = [];
    const seen = new Set<Id>([root.id]);
    const walk = (id: Id, depth: number, parentRow: number): void => {
      for (const k of kids(g, id)) {
        if (seen.has(k.id)) continue;
        seen.add(k.id);
        rows.push({ id: k.id, depth, parentRow, onPath: path.has(k.id), here: k.id === chatId });
        walk(k.id, depth + 1, rows.length - 1);
      }
    };
    walk(root.id, 1, -1);
    return { rootId: root.id, here: path.has(root.id), rows };
  });
}
