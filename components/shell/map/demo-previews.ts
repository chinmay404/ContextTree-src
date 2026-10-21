import type { SourceType } from '@/components/board/api/types';
import type { BoardPreview, BoardPreviewCard } from './preview-types';

interface DeskSpec { id: string; x: number; y: number; src: SourceType[]; label: string; parent?: string }

/** Builds a preview from the mockup's compact desk specs (a desk with sources puts its chat 242 px right of them). */
export function previewFromDesks(desks: DeskSpec[]): BoardPreview {
  const cards: BoardPreviewCard[] = [];
  for (const d of desks) {
    const hasSrc = d.src.length > 0;
    cards.push({ id: d.id, kind: 'chat', sourceType: null, x: d.x + (hasSrc ? 272 : 30), y: d.y + 30, deskId: null, pileId: null, parentId: d.parent ?? null, name: d.label });
    d.src.forEach((t, i) => cards.push({ id: `${d.id}-s${i}`, kind: 'source', sourceType: t, x: d.x + 30, y: d.y + 30 + i * 104, deskId: d.id, pileId: null, parentId: null }));
  }
  return { cards, edges: [] };
}

/** The sign-in backdrop (mockup `thesis`). */
export const THESIS_PREVIEW = previewFromDesks([
  { id: 'a', x: 0, y: 0, src: ['pdf', 'pdf', 'pdf', 'web'], label: 'Commons' },
  { id: 'b', x: 760, y: -380, src: ['pdf'], label: 'Ostrom' },
  { id: 'c', x: 760, y: 120, src: ['pdf', 'image'], label: 'Cities', parent: 'a' },
  { id: 'd', x: 1500, y: -380, src: [], label: 'Rules', parent: 'b' },
  { id: 'e', x: 1500, y: 40, src: [], label: 'Gaps', parent: 'c' },
  { id: 'f', x: 1500, y: 420, src: ['csv'], label: 'Survey', parent: 'c' },
]);

/** Illustrations for the landing (mockup `heat`, `pricing`). TODO(controller): swap for the showcase Board (Tasks 5 and 23). */
export const LANDING_PREVIEWS = {
  hero: previewFromDesks([
    { id: 'a', x: 0, y: 0, src: ['pdf', 'web', 'note'], label: 'Boiler?' },
    { id: 'b', x: 760, y: -150, src: [], label: 'Year one', parent: 'a' },
    { id: 'c', x: 760, y: 300, src: ['pdf'], label: 'Survey', parent: 'a' },
  ]),
  desks: previewFromDesks([{ id: 'a', x: 0, y: 0, src: ['pdf', 'web', 'note'], label: 'Boiler?' }]),
  branches: previewFromDesks([
    { id: 'a', x: 0, y: 0, src: ['video', 'pdf', 'note'], label: 'Price it' },
    { id: 'b', x: 760, y: -220, src: [], label: 'Value?', parent: 'a' },
    { id: 'c', x: 760, y: 280, src: ['web', 'pdf'], label: 'Customers', parent: 'a' },
  ]),
  models: previewFromDesks([
    { id: 'a', x: 0, y: 0, src: ['note'], label: 'One question' },
    { id: 'b', x: 760, y: -330, src: [], label: 'Claude', parent: 'a' },
    { id: 'c', x: 760, y: 0, src: [], label: 'GPT', parent: 'a' },
    { id: 'd', x: 760, y: 330, src: [], label: 'Gemini', parent: 'a' },
  ]),
};
