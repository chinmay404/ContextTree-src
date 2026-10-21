'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ApiKeySettingsDialog } from '@/components/api-key-settings-dialog';
import type { ByokProvider } from '@/lib/byok';
import { HttpKeyStore, type KeyStore } from './keys/key-store';
import { useKeyStatus, type UseKeyStatus } from './keys/use-key-status';
import type { ProviderId } from './keys/status-types';

export interface ShellUser { name: string | null; email: string }
export interface SettingsTarget { section?: 'keys' | 'account'; provider?: ProviderId; onKeySaved?: (p: ProviderId) => void }
export interface ShellValue {
  user: ShellUser;
  keys: UseKeyStatus;
  openSettings(target?: SettingsTarget): void;
}

const Ctx = createContext<ShellValue | null>(null);

export function useShell(): ShellValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useShell must be used inside <ShellProvider>');
  return v;
}

/** Never settles: stands in for the store while the dev mock is still loading, so nothing hits the real API. */
const WAITING: KeyStore = {
  status: () => new Promise(() => {}),
  check: () => new Promise(() => {}),
  save: () => new Promise(() => {}),
  remove: () => new Promise(() => {}),
};

/** The dev mock is a dynamic import that production builds drop (same pattern as the board's engine mock). */
function useKeyStore(mock: boolean): { store: KeyStore; mockUser: ShellUser | null } {
  const real = useMemo(() => new HttpKeyStore(), []);
  const [loaded, setLoaded] = useState<{ store: KeyStore; user: ShellUser } | null>(null);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !mock) return;
    let live = true;
    void import('./dev-shell-mock').then((m) => { if (live) setLoaded({ store: m.getSharedMockKeyStore(), user: m.MOCK_USER }); });
    return () => { live = false; };
  }, [mock]);
  if (!mock || process.env.NODE_ENV === 'production') return { store: real, mockUser: null };
  return loaded ? { store: loaded.store, mockUser: loaded.user } : { store: WAITING, mockUser: null };
}

const V2_PROVIDERS: ByokProvider[] = ['openai', 'anthropic'];

export function ShellProvider({ mock, children }: { mock: boolean; children: ReactNode }): ReactElement {
  const { user: session } = useAuth();
  const { store, mockUser } = useKeyStore(mock);
  const keys = useKeyStatus(store);

  const user = useMemo<ShellUser>(
    () => mockUser ?? { name: session?.name ?? null, email: session?.email ?? '' },
    [mockUser, session?.name, session?.email],
  );

  // Until the settings sheet (Task 18) exists, "settings" is V2's key dialog.
  const [dialog, setDialog] = useState<{ open: boolean; provider?: ByokProvider }>({ open: false });
  const savedCb = useRef<SettingsTarget['onKeySaved']>(undefined);
  const openSettings = useCallback((target?: SettingsTarget) => {
    savedCb.current = target?.onKeySaved;
    const provider = V2_PROVIDERS.find((p) => p === target?.provider);
    setDialog({ open: true, provider });
  }, []);

  const refresh = keys.refresh;
  const onKeysChanged = useCallback(() => { void refresh(); }, [refresh]);

  const value = useMemo<ShellValue>(() => ({ user, keys, openSettings }), [user, keys, openSettings]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <ApiKeySettingsDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        initialProvider={dialog.provider}
        onKeysChanged={onKeysChanged}
      />
    </Ctx.Provider>
  );
}
