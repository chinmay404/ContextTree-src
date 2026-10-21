import type { V3KeyProvider } from '@/lib/byok';

/** The seven providers a board turn can run on. Task 13's providers.ts re-exports these. */
export type ProviderId = V3KeyProvider;
export type KeyState = 'ok' | 'rejected' | 'unchecked';
export interface KeyStatus {
  provider: ProviderId;
  configured: boolean;
  last4: string | null;
  status: KeyState | null;
  checkedAt: string | null;
  updatedAt: string | null;
}
export type KeyStatusMap = Record<ProviderId, KeyStatus>;
