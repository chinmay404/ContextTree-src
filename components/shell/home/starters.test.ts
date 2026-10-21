import { describe, expect, it, vi } from 'vitest';
import { MockEngineApi } from '@/components/board/api/mock/mock-engine-api';
import { ApiError, type ChatData } from '@/components/board/api/types';
import { MODELS } from '@/components/board/lib/catalog';
import { STARTERS, seedStarter, starterPreview } from './starters';

const fresh = () => new MockEngineApi({ seed: false });
const opts = { model: MODELS.mistral.engineId };

const COUNTS: Record<string, [number, number]> = { pdf2: [3, 1], research: [2, 2], compare: [4, 1], plan: [2, 3] };

describe('starters', () => {
  it('has the four templates with q1 first at 0,0', () => {
    expect(STARTERS.map((s) => s.key)).toEqual(['pdf2', 'research', 'compare', 'plan']);
    for (const s of STARTERS) expect(s.cards[0]).toMatchObject({ ref: 'q1', kind: 'chat', x: 0, y: 0 });
  });

  it.each(STARTERS.map((s) => s.key))('%s seeds the right counts, parents and desks', async (key) => {
    const t = STARTERS.find((s) => s.key === key)!;
    const api = fresh();
    const id = await seedStarter(api, t, opts);
    const board = await api.getBoard(id);
    const chats = board.cards.filter((c) => c.kind === 'chat');
    const notes = board.cards.filter((c) => c.kind === 'source');
    expect([chats.length, notes.length]).toEqual(COUNTS[key]);
    expect(board.title).toBe(t.title);
    for (const c of chats.slice(1)) expect(c.parentId).toBeTruthy();
    for (const n of notes) {
      expect(n.sourceType).toBe('note');
      expect(chats.map((c) => c.id)).toContain(n.deskId);
      expect((n.data as { text?: string }).text).toBeTruthy();
    }
  });

  it('q1 takes opts.model and the template name; fixed-model branches keep theirs', async () => {
    const api = fresh();
    const t = STARTERS.find((s) => s.key === 'compare')!;
    const board = await api.getBoard(await seedStarter(api, t, opts));
    const q1 = board.cards.find((c) => c.id.endsWith('_q1'))!;
    expect((q1.data as ChatData).model).toBe(opts.model);
    expect((q1.data as ChatData).name).toBe(t.cards[0].name);
    const models = board.cards.filter((c) => c.kind === 'chat' && !c.id.endsWith('_q1')).map((c) => (c.data as ChatData).model).sort();
    expect(models).toEqual([MODELS.claude.engineId, MODELS.gemini.engineId, MODELS.gpt.engineId].sort());
  });

  it('positions equal starterPreview', async () => {
    for (const t of STARTERS) {
      const api = fresh();
      const board = await api.getBoard(await seedStarter(api, t, opts));
      const pv = starterPreview(t);
      expect(pv.cards).toHaveLength(board.cards.length);
      const key = (xs: { x: number; y: number }[]) => xs.map((c) => `${c.x},${c.y}`).sort();
      expect(key(pv.cards)).toEqual(key(board.cards));
    }
  });

  it('a failure on the 3rd createCard deletes the half-made board and rethrows', async () => {
    const api = fresh();
    const real = api.createCard.bind(api);
    let n = 0;
    vi.spyOn(api, 'createCard').mockImplementation((...a) => {
      if (++n === 3) return Promise.reject(new ApiError(500, 'boom'));
      return real(...a);
    });
    const del = vi.spyOn(api, 'deleteBoard');
    await expect(seedStarter(api, STARTERS.find((s) => s.key === 'compare')!, opts)).rejects.toMatchObject({ status: 500 });
    expect(del).toHaveBeenCalledTimes(1);
    expect(await api.listBoards()).toHaveLength(0);
  });

  it('swallows a failing cleanup and still rethrows the original error', async () => {
    const api = fresh();
    vi.spyOn(api, 'createCard').mockRejectedValue(new ApiError(500, 'first'));
    vi.spyOn(api, 'deleteBoard').mockRejectedValue(new Error('cleanup failed'));
    await expect(seedStarter(api, STARTERS[0], opts)).rejects.toMatchObject({ code: 'first' });
  });
});
