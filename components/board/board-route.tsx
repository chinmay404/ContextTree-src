'use client';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeProvider } from '@/components/theme-provider';
import { BrandLoader } from '@/components/brand-loader';
import { ApiKeySettingsDialog } from '@/components/api-key-settings-dialog';
import { useAuth } from '@/hooks/use-auth';
import { Board } from './Board';
import { BoardList } from './board-list';
import { HttpEngineApi } from './api/http';
import { getSharedMockApi } from './api/dev-mock';
import { ApiError, type EngineApi } from './api/types';
import './board-route.css';

/** Pebble board token (--pb-canvas): the board paints only inside .pb-root, so the page behind it must match. */
const PB_CANVAS = '#EDE8F5';

function useEngineApi(mock: boolean): EngineApi {
  return useMemo(() => (mock ? getSharedMockApi() : new HttpEngineApi()), [mock]);
}

/**
 * Light scope: forced light theme and the Pebble background on html/body while a board route is mounted.
 * The app's root ThemeProvider (dark default) applies its class after our nested one, so the light class is
 * re-asserted whenever <html> changes.
 */
function LightScope({ children }: { children: React.ReactNode }): ReactElement {
  useEffect(() => {
    const html = document.documentElement;
    const els = [html, document.body];
    const prev = els.map((e) => e.style.backgroundColor);
    const prevClass = html.className;
    const prevScheme = html.style.colorScheme;
    // Only write when something differs: our own writes re-trigger the observer.
    const apply = () => {
      if (html.classList.contains('dark')) html.classList.remove('dark');
      if (!html.classList.contains('light')) html.classList.add('light');
      if (html.style.colorScheme !== 'light') html.style.colorScheme = 'light';
      els.forEach((e) => { if (e.style.backgroundColor !== 'rgb(237, 232, 245)') e.style.backgroundColor = PB_CANVAS; });
    };
    apply();
    const mo = new MutationObserver(apply);
    mo.observe(html, { attributes: true, attributeFilter: ['class', 'style'] });
    return () => {
      mo.disconnect();
      html.className = prevClass;
      html.style.colorScheme = prevScheme;
      els.forEach((e, i) => { e.style.backgroundColor = prev[i]; });
    };
  }, []);
  return (
    <ThemeProvider attribute="class" forcedTheme="light" enableSystem={false}>
      {children}
    </ThemeProvider>
  );
}

function Splash(): ReactElement {
  return (
    <div className="br-center" role="status" aria-label="Loading">
      <BrandLoader variant="pulse" size={72} />
    </div>
  );
}

function Message({ text, children }: { text: string; children: React.ReactNode }): ReactElement {
  return (
    <div className="br-center">
      <div className="br-msg" role="alert">
        <p>{text}</p>
        {children}
      </div>
    </div>
  );
}

/** Signed-out visitors go to sign-in and come back; mock mode (dev only) skips the session. */
function useSessionGate(mock: boolean, callbackUrl: string): 'loading' | 'ready' {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const out = !mock && !isLoading && !isAuthenticated;
  useEffect(() => {
    if (out) router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }, [out, router, callbackUrl]);
  return mock || (!isLoading && isAuthenticated) ? 'ready' : 'loading';
}

export function BoardRoute({ boardId, mock = false }: { boardId: string; mock?: boolean }): ReactElement {
  const router = useRouter();
  const gate = useSessionGate(mock, `/b/${boardId}`);
  const base = useEngineApi(mock);
  const [fail, setFail] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const q = mock ? '?api=mock' : '';

  // Same API, but a failed first load of this board is reported to the route (Board itself shows only a generic retry).
  const api = useMemo<EngineApi>(
    () =>
      new Proxy(base, {
        get(t, k, r) {
          const v = Reflect.get(t, k, r);
          if (typeof v !== 'function') return v;
          if (k !== 'getBoard') return v.bind(t);
          return async (id: string) => {
            try {
              return await t.getBoard(id);
            } catch (e) {
              if (e instanceof ApiError && id === boardId) setFail(e);
              throw e;
            }
          };
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base, boardId, attempt],
  );

  const onOpenBoard = useCallback((id: string) => router.push(`/b/${id}${q}`), [router, q]);
  const onOpenSettings = useCallback(() => setSettingsOpen(true), []);

  let body: ReactElement;
  if (gate === 'loading') body = <Splash />;
  else if (fail?.status === 404) {
    body = (
      <Message text="This board doesn't exist or isn't yours.">
        <Link className="br-btn" href={`/boards${q}`}>Your boards</Link>
      </Message>
    );
  } else if (fail?.status === 503) {
    body = (
      <Message text="Can't reach Context Tree right now.">
        <button className="br-btn" onClick={() => { setFail(null); setAttempt((n) => n + 1); }}>Try again</button>
      </Message>
    );
  } else {
    body = (
      <>
        <Board api={api} boardId={boardId} onOpenBoard={onOpenBoard} onOpenSettings={onOpenSettings} />
        <ApiKeySettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </>
    );
  }
  return <LightScope>{body}</LightScope>;
}

export function BoardsRoute({ mock = false }: { mock?: boolean }): ReactElement {
  const gate = useSessionGate(mock, '/boards');
  const api = useEngineApi(mock);
  return <LightScope>{gate === 'loading' ? <Splash /> : <BoardList api={api} query={mock ? '?api=mock' : ''} />}</LightScope>;
}
