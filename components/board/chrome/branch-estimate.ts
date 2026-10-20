import type { Message, Reads } from '../api/types';
import { strip } from '../lib/format';
import { isRead } from '../lib/reads';
import type { BranchDraft } from '../store';

/** The sheet's "About Nk tokens per question" (prototype estimate, line 909). */
export function estimateTokens(d: BranchDraft, parent: { reads: Reads; messages: Message[] } | null): number {
  let t = 250 + Math.round(d.personaText.length / 4);
  if (parent) {
    if (d.carry === 'summary') t += 720;
    else if (d.carry === 'whole') t += Math.round(strip(parent.messages.map((m) => m.content).join(' ')).length / 4);
    if (d.inheritDesk) t += parent.reads.items.filter(isRead).reduce((a, i) => a + i.tokens, 0) * (d.advanced.externalContextTopK + 1) / 6;
  }
  t = Math.round(t);
  const budget = d.advanced.contextBudgetTokens;
  return budget ? Math.min(t, budget) : t;
}
