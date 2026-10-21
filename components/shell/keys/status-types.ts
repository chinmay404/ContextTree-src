import type { ProviderId } from '@/components/board/api/types';

export type { ProviderId };
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
