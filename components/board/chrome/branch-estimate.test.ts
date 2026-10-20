import { estimateTokens } from './branch-estimate';
import { DEFAULT_ADVANCED } from '../lib/catalog';
import type { BranchDraft } from '../store';
import type { Message, Reads } from '../api/types';

const draft: BranchDraft = {
  name: 'x', first: '', model: 'openai/gpt-oss-120b', persona: 'none', personaText: '', inheritDesk: true, carry: 'summary',
  advanced: { ...DEFAULT_ADVANCED }, advOpen: false,
};
const reads = { chatId: 'p', items: [{ cardId: 'a', how: 'desk', via: 'p', inherited: false, hidden: false, state: 'ready', tokens: 1200 }], totalTokens: 1200 } as Reads;

it('adds summary and desk reads like the prototype', () => {
  const d = { ...draft, carry: 'summary' as const, inheritDesk: true, personaText: '', advanced: { ...DEFAULT_ADVANCED, externalContextTopK: 5 } };
  expect(estimateTokens(d, { reads, messages: [] })).toBe(Math.round(250 + 720 + 1200 * 6 / 6));
});
it('the budget caps the estimate', () => {
  const d = { ...draft, advanced: { ...DEFAULT_ADVANCED, contextBudgetTokens: 500 } };
  expect(estimateTokens(d, { reads, messages: [] })).toBe(500);
});
it('fresh start adds nothing from the parent chat', () => {
  expect(estimateTokens({ ...draft, carry: 'fresh', inheritDesk: false }, { reads, messages: [] })).toBe(250);
});
it('a root question has no parent to add', () => {
  expect(estimateTokens({ ...draft, personaText: 'x'.repeat(40) }, null)).toBe(260);
});
it('the whole chat counts its text without markup; hidden and unready reads do not count', () => {
  const messages = [{ id: 'm', role: 'user', content: '<p>' + 'a'.repeat(400) + '</p>', position: 0, createdAt: '' }] as Message[];
  const r = { ...reads, items: [{ ...reads.items[0], hidden: true }, { ...reads.items[0], state: 'processing' }] } as Reads;
  expect(estimateTokens({ ...draft, carry: 'whole' }, { reads: r, messages })).toBe(250 + 100);
});
it('excerpts per question scale the desk part', () => {
  const at = (k: number) => estimateTokens({ ...draft, carry: 'fresh', advanced: { ...DEFAULT_ADVANCED, externalContextTopK: k } }, { reads, messages: [] });
  expect(at(10)).toBeGreaterThan(at(5));
});
