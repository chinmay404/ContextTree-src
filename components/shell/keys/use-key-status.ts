'use client';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { KeyController, type KeyViewState } from './key-controller';
import type { KeyStore } from './key-store';
import type { KeyStatus, ProviderId } from './status-types';

export interface UseKeyStatus extends KeyViewState {
  refresh(): Promise<void>;
  check(force?: boolean): Promise<void>;
  save(p: ProviderId, k: string): Promise<KeyStatus>;
  remove(p: ProviderId): Promise<void>;
}

export function useKeyStatus(store: KeyStore): UseKeyStatus {
  const ctl = useMemo(() => new KeyController(store), [store]);
  const state = useSyncExternalStore(ctl.subscribe, ctl.getSnapshot, ctl.getSnapshot);
  useEffect(() => { void ctl.refresh(); }, [ctl]);
  return useMemo(
    () => ({
      ...state,
      refresh: () => ctl.refresh(),
      check: (force?: boolean) => ctl.check(force),
      save: (p, k) => ctl.save(p, k),
      remove: (p) => ctl.remove(p),
    }),
    [state, ctl],
  );
}
