import { V3_KEY_PROVIDERS } from '@/lib/byok';
import type { KeyStatusMap } from './status-types';

export type KeyTone = 'ready' | 'stale' | 'failed';

/** One line for the account menu: "2 of 7 working", "No keys yet", "1 key rejected" or "Checking…". */
export function keyStatusLine(statuses: KeyStatusMap | null): { text: string; tone: KeyTone } {
  if (!statuses) return { text: 'Checking…', tone: 'stale' };
  const all = V3_KEY_PROVIDERS.map((p) => statuses[p]);
  const rejected = all.filter((s) => s.configured && s.status === 'rejected').length;
  if (rejected > 0) return { text: rejected === 1 ? '1 key rejected' : `${rejected} keys rejected`, tone: 'failed' };
  const working = all.filter((s) => s.configured).length;
  if (working === 0) return { text: 'No keys yet', tone: 'stale' };
  return { text: `${working} of ${V3_KEY_PROVIDERS.length} working`, tone: 'ready' };
}
