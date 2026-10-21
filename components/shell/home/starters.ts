import { newId } from '@/components/board/api/ids';
import type { EngineApi, Id } from '@/components/board/api/types';
import { MODELS, defaultChatData, type ModelKey } from '@/components/board/lib/catalog';
import type { BoardPreview, BoardPreviewCard } from '../map/preview-types';

export interface StarterCard {
  ref: string;
  kind: 'chat' | 'note';
  x: number;
  y: number;
  name?: string;
  model?: ModelKey;
  text?: string;
  desk?: string;
  parent?: string;
}
export interface StarterTemplate { key: string; name: string; blurb: string; title: string; cards: StarterCard[] }

const BRANCH_DX = 760; // a branch sits this far right of its parent
const DESK_DX = 242;   // a desk's sources sit this far left of their chat
const ROW = 104;       // and this far apart

/** Lays a template out: chats at explicit spots, each chat's notes on its desk. */
function build(key: string, name: string, blurb: string, title: string, spec: {
  chats: { ref: string; name: string; model?: ModelKey; parent?: string; dy?: number }[];
  notes: Record<string, string[]>;
}): StarterTemplate {
  const at = new Map<string, { x: number; y: number }>();
  const cards: StarterCard[] = [];
  for (const c of spec.chats) {
    const p = c.parent ? at.get(c.parent)! : { x: -BRANCH_DX, y: 0 };
    const pos = c.parent ? { x: p.x + BRANCH_DX, y: p.y + (c.dy ?? 0) } : { x: 0, y: 0 };
    at.set(c.ref, pos);
    cards.push({ ref: c.ref, kind: 'chat', x: pos.x, y: pos.y, name: c.name, model: c.model, parent: c.parent });
    (spec.notes[c.ref] ?? []).forEach((text, i) =>
      cards.push({ ref: `${c.ref}-n${i + 1}`, kind: 'note', x: pos.x - DESK_DX, y: pos.y + i * ROW, text, desk: c.ref }));
  }
  return { key, name, blurb, title, cards };
}

export const STARTERS: StarterTemplate[] = [
  build('pdf2', 'Read a PDF with two AIs', 'One desk, two branches, two models.', 'Read a PDF with two AIs', {
    chats: [
      { ref: 'q1', name: 'What does this paper argue?' },
      { ref: 'gem', name: 'Same paper, on Gemini', model: 'gemini', parent: 'q1', dy: -170 },
      { ref: 'cla', name: 'Same paper, on Claude', model: 'claude', parent: 'q1', dy: 200 },
    ],
    notes: { q1: ['Drop your PDF on this desk, then ask.'] },
  }),
  build('research', 'Research a topic', 'Pin sources, then add one and compare.', 'Research a topic', {
    chats: [
      { ref: 'q1', name: 'What do we know about this?' },
      { ref: 'more', name: 'With one more source', parent: 'q1', dy: 40 },
    ],
    notes: {
      q1: ['Pin links and PDFs here. This desk is what the chat reads.'],
      more: ['Drop one new source here and compare the answers.'],
    },
  }),
  build('compare', 'Compare answers', 'Same question on three AIs.', 'Compare answers', {
    chats: [
      { ref: 'q1', name: 'One question' },
      { ref: 'cla', name: 'On Claude', model: 'claude', parent: 'q1', dy: -330 },
      { ref: 'gpt', name: 'On GPT', model: 'gpt', parent: 'q1', dy: 0 },
      { ref: 'gem', name: 'On Gemini', model: 'gemini', parent: 'q1', dy: 330 },
    ],
    notes: { q1: ['Ask in the first chat, then ask each branch the same thing.'] },
  }),
  build('plan', 'Plan from notes', 'Turn loose notes into a plan.', 'Plan from notes', {
    chats: [
      { ref: 'q1', name: 'Turn these notes into a plan' },
      { ref: 'step', name: "What's the first step this week?", parent: 'q1', dy: 90 },
    ],
    notes: {
      q1: ['Goal: say what done looks like.', 'Constraints: time, money, people.', 'Ideas: anything you have thought of so far.'],
    },
  }),
];

/** The tile's map, drawn from the template with no request. */
export function starterPreview(t: StarterTemplate): BoardPreview {
  const cards: BoardPreviewCard[] = t.cards.map((c) =>
    c.kind === 'chat'
      ? { id: c.ref, kind: 'chat', sourceType: null, x: c.x, y: c.y, deskId: null, pileId: null, parentId: c.parent ?? null, name: c.name }
      : { id: c.ref, kind: 'source', sourceType: 'note', x: c.x, y: c.y, deskId: c.desk ?? null, pileId: null, parentId: null },
  );
  return { cards, edges: [] };
}

/**
 * Makes a board from a template through the engine API (FastAPI stays the only writer).
 * Any failure deletes the half-made board and rethrows.
 * Callers pass `preferredModel(statuses) ?? MODELS[DEFAULT_MODEL_KEY].engineId` as `opts.model`.
 */
export async function seedStarter(
  api: EngineApi,
  t: StarterTemplate,
  opts: { model: string; mkId?: (prefix: 'b' | 'c') => string },
): Promise<Id> {
  const mk = opts.mkId ?? ((p: 'b' | 'c') => newId(p === 'b' ? 'b' : 'c'));
  const boardId = mk('b');
  const ids = new Map<string, Id>([['q1', `${boardId}_q1`]]);
  try {
    await api.createBoard({ id: boardId, title: t.title });
    const q1 = t.cards[0];
    await api.updateCard(boardId, ids.get('q1')!, { data: { name: q1.name, model: opts.model } });
    for (const c of t.cards.slice(1)) {
      const id = mk('c');
      ids.set(c.ref, id);
      if (c.kind === 'chat') {
        await api.createCard(boardId, {
          id, kind: 'chat', x: c.x, y: c.y, parentId: c.parent ? ids.get(c.parent) : null,
          data: defaultChatData(c.name ?? 'New question', c.model ? MODELS[c.model].engineId : opts.model),
        });
      } else {
        await api.createCard(boardId, {
          id, kind: 'source', sourceType: 'note', x: c.x, y: c.y, deskId: c.desk ? ids.get(c.desk) : null,
          data: { text: c.text ?? '' },
        });
      }
    }
    return boardId;
  } catch (e) {
    try { await api.deleteBoard(boardId); } catch { /* cleanup is best effort */ }
    throw e;
  }
}
