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

/** Starter board thumbnails (mockup `s_*`). The starters themselves arrive with Task 20. */
export const STARTER_PREVIEWS = {
  pdf2: previewFromDesks([
    { id: 'a', x: 0, y: 0, src: ['pdf'], label: 'Summarise the paper' },
    { id: 'b', x: 760, y: -170, src: [], label: 'On Claude', parent: 'a' },
    { id: 'c', x: 760, y: 200, src: [], label: 'On GPT', parent: 'a' },
  ]),
  research: previewFromDesks([
    { id: 'a', x: 0, y: 0, src: ['web', 'pdf', 'video'], label: 'The question' },
    { id: 'b', x: 760, y: 40, src: ['web'], label: 'One more source', parent: 'a' },
  ]),
  compare: previewFromDesks([
    { id: 'a', x: 0, y: 0, src: ['note'], label: 'One question' },
    { id: 'b', x: 760, y: -330, src: [], label: 'Claude', parent: 'a' },
    { id: 'c', x: 760, y: 0, src: [], label: 'GPT', parent: 'a' },
    { id: 'd', x: 760, y: 330, src: [], label: 'Gemini', parent: 'a' },
  ]),
  plan: previewFromDesks([
    { id: 'a', x: 0, y: 0, src: ['note', 'note', 'note'], label: 'Your notes' },
    { id: 'b', x: 760, y: 90, src: ['csv'], label: 'The plan', parent: 'a' },
  ]),
};
