import { DEFAULT_ADVANCED, MODELS, PERSONAS } from '../../lib/catalog';
import type { Board, Card, ChatData, Edge, Excerpt, Id, Message, SourceData, SourceType, Status } from '../types';

export const SEED_BOARD_ID = 'b_seed';

const A_MAIN = `### Start from your floor
Your note puts costs near $0.40 per active user a month, and you said never below $8.

### What the desk says
The survey's median is $12. The video's point: people pay for time saved, not features.

### So
1. **Free** with your own key.
2. **$12 a month** with hosted models.
3. **$59 once** for the first 300.`;

const A_SECOND = `Start at $15 a month. The two new sources both point above the $12 the first answer suggested.

### What the new sources add
The blog post reports that doubling the price lost only 6% of users. Two of three interviewees said they would pay $15.

### Where it lands
1. **Free** with your own key, as before.
2. **$15 a month** with hosted models and sync.
3. Revisit after the first 100 paying users.`;

const A_SIDE = "Price from what it's worth to the customer, not from what it costs you. If it saves two hours a week, that time is your anchor.";
const A_DEEP = 'A team plan at $12 a seat lets you keep $15 for individuals without losing agencies.';

const at = (hh: number, mm: number) => `2026-10-19T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00.000Z`;
const ex = (loc: string | null, text: string, on = true): Excerpt => ({ loc, text, on });
const clip = (s: string) => s.slice(0, 280);

interface ChatSeed {
  id: Id; model: keyof typeof MODELS; name: string; x: number; y: number; at: string; parentId?: Id;
  persona?: 'teacher' | 'skeptic'; user: string; answer: string;
}

const CHATS: ChatSeed[] = [
  { id: 'main', model: 'claude', name: 'How should I price Context Tree?', x: 252, y: 0, at: at(10, 12),
    user: 'Using what is on this desk, what should a solo founder charge?', answer: A_MAIN },
  { id: 'side', model: 'gpt', name: 'What does value-based pricing mean?', x: 780, y: -160, at: at(10, 20), parentId: 'main', persona: 'teacher',
    user: 'Same desk, different question: what does value-based pricing mean?', answer: A_SIDE },
  { id: 'second', model: 'gemini', name: 'Second opinion with real customers', x: 780, y: 300, at: at(10, 31), parentId: 'main', persona: 'skeptic',
    user: 'Same question, with the blog post and the interviews on my desk too.', answer: A_SECOND },
  { id: 'deep', model: 'gemini', name: 'Would a team plan change this?', x: 1580, y: 340, at: at(11, 2), parentId: 'second',
    user: 'Marco wants a team plan. Would that change the price?', answer: A_DEEP },
];

interface SourceSeed {
  id: Id; type: SourceType; x: number; y: number; deskId: Id | null; pileId?: Id; status: Status; data: SourceData;
}

const CSV_ROWS = [
  ['Typing', '$20', 'Monthly'], ['RabbitHoles', '$15', 'Monthly'], ['Canvas AI', '$12', 'Monthly'],
  ['Median (18 tools)', '$12', '—'], ['Free tier', '$0', 'Own key'],
];

const SOURCES: SourceSeed[] = [
  { id: 'video', type: 'video', x: 0, y: 0, deskId: 'main', status: 'soon', data: {
    title: 'How to price a developer tool', meta: 'YouTube · 18:42',
    excerpts: [ex('12:04', 'Developers pay for time saved, not features.'), ex('18:10', "Anchor the price to an hour of a developer's time."), ex('02:30', 'Sponsor segment', false)] } },
  { id: 'pdf', type: 'pdf', x: 0, y: 112, deskId: 'main', status: 'ready', data: {
    title: 'Pricing survey 2025', meta: 'PDF · 24 pages', desc: 'Our main benchmark. Trust it over blog posts.',
    summary: 'A survey of 412 solo founders selling developer tools. Prices cluster between $8 and $20 a month; the median is $12. Annual plans are offered by 61% of tools.',
    excerpts: [ex('p. 3', 'Solo-dev tools cluster between $8 and $20.'), ex('p. 7', 'Median price for tools like this is $12.'), ex('p. 19', 'Methodology and sample', false)] } },
  { id: 'note', type: 'note', x: 0, y: 238, deskId: 'main', status: 'ready', data: {
    text: 'Costs ≈ $0.40 per active user a month. Never go below $8.', meta: 'Note · You' } },
  { id: 'web', type: 'web', x: 1140, y: 300, deskId: 'second', status: 'ready', data: {
    title: 'Why we doubled our price', meta: 'harbor.dev',
    summary: 'Harbor doubled its price from $9 to $18. They lost 6% of users and revenue rose 88% in the first quarter.',
    excerpts: [ex('§ 2', 'Doubling the price lost only 6% of users.')] } },
  { id: 'interviews', type: 'pile', x: 1140, y: 410, deskId: 'second', status: 'ready', data: { title: 'Customer interviews', meta: '4 files' } },
  { id: 'podcast', type: 'audio', x: 0, y: 470, deskId: null, status: 'soon', data: {
    title: 'The pricing episode', meta: 'Podcast · 38:10',
    excerpts: [ex('21:40', "Raise prices before you think you're ready."), ex('30:05', 'Lifetime deals attract the wrong first users.')] } },
  { id: 'csv', type: 'csv', x: 1300, y: 700, deskId: null, status: 'ready', data: {
    title: 'Competitor prices', meta: 'CSV · 18 rows', table: { columns: ['Tool', 'Price', 'Billing'], rows: CSV_ROWS },
    excerpts: [ex('B-014', 'Median $12 across 18 tools; range $0–$20.')] } },
  { id: 'shot', type: 'image', x: 1960, y: 340, deskId: 'deep', status: 'soon', data: {
    title: 'Pricing page screenshot', meta: 'Image · PNG', desc: 'A competitor page. Copy the three-tier layout, not the prices.',
    excerpts: [ex(null, 'Three tiers; the middle one is highlighted and marked “Most popular”.')] } },
];

const MEMBERS: SourceSeed[] = [
  { id: 'interviews_1', type: 'pdf', x: 1140, y: 410, deskId: null, pileId: 'interviews', status: 'ready', data: {
    title: 'Priya, indie developer', meta: 'PDF · 9 pages', excerpts: [ex('p. 2', 'Would pay $15 without thinking.')] } },
  { id: 'interviews_2', type: 'pdf', x: 1140, y: 410, deskId: null, pileId: 'interviews', status: 'ready', data: {
    title: 'Marco, agency lead', meta: 'PDF · 12 pages', excerpts: [ex('p. 6', 'Wants a team plan first.')] } },
  { id: 'interviews_3', type: 'pdf', x: 1140, y: 410, deskId: null, pileId: 'interviews', status: 'ready', data: {
    title: 'Lea, student', meta: 'PDF · 10 pages', excerpts: [ex('p. 3', 'Would only use the free tier.')] } },
  { id: 'interviews_4', type: 'doc', x: 1140, y: 410, deskId: null, pileId: 'interviews', status: 'ready', data: {
    title: 'Interview notes', meta: 'Document · 3 KB', text: 'Patterns: people anchor on ChatGPT Plus ($20).',
    excerpts: [ex(null, 'People anchor on ChatGPT Plus at $20.')] } },
];

export function seedBoard(): { board: Board; messages: Record<Id, Message[]> } {
  const boardId = SEED_BOARD_ID;
  const messages: Record<Id, Message[]> = {};
  const cards: Card[] = [];
  const edges: Edge[] = [];

  for (const c of CHATS) {
    const persona = c.persona ?? 'none';
    const data: ChatData = {
      name: c.name, model: MODELS[c.model].engineId, persona, systemPrompt: PERSONAS[persona].text,
      inheritDesk: true, carry: 'summary', advanced: { ...DEFAULT_ADVANCED }, hide: [],
    };
    cards.push({
      id: c.id, boardId, kind: 'chat', sourceType: null, x: c.x, y: c.y, deskId: null, pileId: null,
      parentId: c.parentId ?? null, forkedFromMessageId: null, status: null, data,
      createdAt: c.at, updatedAt: c.at, messageCount: 2, lastMessage: { role: 'assistant', content: clip(c.answer) },
    });
    messages[c.id] = [
      { id: `seed_${c.id}_u`, role: 'user', content: c.user, position: 0, createdAt: c.at },
      { id: `seed_${c.id}_a`, role: 'assistant', content: c.answer, position: 1, createdAt: c.at },
    ];
    if (c.parentId) edges.push({ id: `lin_${c.id}`, boardId, kind: 'lineage', from: c.parentId, to: c.id, createdAt: c.at });
  }

  // Sources follow seed order, just after the last chat; pile members follow their pile.
  const sources = [...SOURCES.slice(0, 5), ...MEMBERS, ...SOURCES.slice(5)];
  sources.forEach((s, i) => {
    const t = at(11, 10 + i);
    cards.push({
      id: s.id, boardId, kind: 'source', sourceType: s.type, x: s.x, y: s.y, deskId: s.deskId, pileId: s.pileId ?? null,
      parentId: null, forkedFromMessageId: null, status: s.status, data: s.data, createdAt: t, updatedAt: t,
    });
  });

  edges.push({ id: 'e_seed_csv_deep', boardId, kind: 'wire', from: 'csv', to: 'deep', createdAt: at(11, 30) });
  edges.push({ id: 'e_seed_side_deep', boardId, kind: 'answer', from: 'side', to: 'deep', createdAt: at(11, 31) });

  return {
    board: { id: boardId, title: 'Pricing study', viewport: null, cards, edges, createdAt: at(10, 12), updatedAt: at(11, 31) },
    messages,
  };
}
