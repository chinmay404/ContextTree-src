'use client';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeProvider } from '@/components/theme-provider';
import { BrandLoader } from '@/components/brand-loader';
import { useAuth } from '@/hooks/use-auth';
import { ShellProvider, useShell } from '@/components/shell/shell-context';
import { AccountPill } from '@/components/shell/account/AccountPill';
import { isModelLocked as modelLocked, preferredModel } from '@/components/shell/keys/providers';
import { useLiveModels } from '@/components/shell/keys/live-models';
import type { ProviderId } from '@/components/shell/keys/status-types';
import { providerOf } from './lib/catalog';
import { peekFirstAsk, takeFirstAsk } from '@/components/shell/home/first-ask';
import { Board } from './Board';
import { BoardsHome } from '@/components/shell/home/BoardsHome';
import { HttpEngineApi } from './api/http';
import { guardFirstLoad } from './first-load-guard';
import type { ApiError, EngineApi } from './api/types';
import './board-route.css';

/** Pebble board token (--pb-canvas): the board paints only inside .pb-root, so the page behind it must match. */
const PB_CANVAS = '#F5F5F7';
/** The boards home sits on the desk grey (--pb-desk). */
const HOME_BG = '#EBEBF0';

/** null while the dev mock is still loading. The mock is a dynamic import that production builds drop. */
function useEngineApi(mock: boolean): EngineApi | null {
  const real = useMemo(() => new HttpEngineApi(), []);
  const [mockApi, setMockApi] = useState<EngineApi | null>(null);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !mock) return;
    let live = true;
    void import('./api/dev-mock').then((m) => {
      // Dev only: ?fail=<method> makes that call answer 503 once (e.g. ?fail=listBoards).
      const q = new URLSearchParams(window.location.search);
      if (live) setMockApi(m.getSharedMockApi({ fail: q.get('fail') ?? undefined, empty: q.get('mock') === 'empty' }));
    });
    return () => { live = false; };
  }, [mock]);
  return mock ? mockApi : real;
}

/**
 * Light scope: forced light theme and the Pebble background on html/body while a board route is mounted.
 * The app's root ThemeProvider (dark default) applies its class after our nested one, so the light class is
 * re-asserted whenever <html> changes.
 */
function LightScope({ children, bg = PB_CANVAS }: { children: React.ReactNode; bg?: string }): ReactElement {
  useEffect(() => {
    const html = document.documentElement;
    const els = [html, document.body];
    const prev = els.map((e) => e.style.backgroundColor);
    const prevClass = html.className;
    const prevScheme = html.style.colorScheme;
    const probe = document.createElement('i');
    probe.style.backgroundColor = bg;
    const want = probe.style.backgroundColor; // normalised, e.g. rgb(235, 235, 240)
    // Only write when something differs: our own writes re-trigger the observer.
    const apply = () => {
      if (html.classList.contains('dark')) html.classList.remove('dark');
      if (!html.classList.contains('light')) html.classList.add('light');
      if (html.style.colorScheme !== 'light') html.style.colorScheme = 'light';
      els.forEach((e) => { if (e.style.backgroundColor !== want) e.style.backgroundColor = bg; });
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
  }, [bg]);
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

function BoardRouteInner({ boardId, mock }: { boardId: string; mock: boolean }): ReactElement {
  const { openSettings, keys } = useShell();
  const statuses = keys.statuses;
  // The question typed on the empty boards home: asked once, in this board's first chat. Cleared after mount (renders can run twice).
  const initialAsk = useMemo(() => peekFirstAsk(boardId) ?? undefined, [boardId]);
  useEffect(() => { takeFirstAsk(boardId); }, [boardId]);
  const router = useRouter();
  const gate = useSessionGate(mock, `/b/${boardId}`);
  const base = useEngineApi(mock);
  // The failure is tied to its board id, so navigating to another board starts clean.
  const [failure, setFailure] = useState<{ boardId: string; err: ApiError } | null>(null);
  const fail = failure && failure.boardId === boardId ? failure.err : null;
  const [attempt, setAttempt] = useState(0);
  const q = mock ? '?api=mock' : '';

  // Same API, but a failed FIRST load of this board is reported to the route (Board itself shows only a generic retry).
  const api = useMemo<EngineApi | null>(
    () => (base ? guardFirstLoad(base, boardId, (err) => setFailure({ boardId, err })) : null),
    // attempt: "Try again" gets a fresh guard (and so a fresh first load)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base, boardId, attempt],
  );

  const signedOut = fail?.status === 401;
  useEffect(() => {
    if (signedOut) router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(`/b/${boardId}`)}`);
  }, [signedOut, router, boardId]);

  const onOpenBoard = useCallback((id: string) => router.push(`/b/${id}${q}`), [router, q]);
  const onOpenSettings = useCallback(
    // Board callers pass a provider id or an engine-id prefix ("gemini", "meta-llama").
    (p?: string) => openSettings({ section: 'keys', provider: p ? (providerOf(`${p}/`) ?? (p as ProviderId)) : undefined }),
    [openSettings],
  );
  const isModelLocked = useCallback((engineId: string) => modelLocked(engineId, statuses), [statuses]);
  const liveModels = useLiveModels(mock ? null : statuses, keys.lastSaved?.at);

  let body: ReactElement;
  if (gate === 'loading' || !api || signedOut) body = <Splash />;
  else if (fail?.status === 404) {
    body = (
      <Message text="This board doesn't exist or isn't yours.">
        <Link className="br-btn" href={`/boards${q}`}>Your boards</Link>
      </Message>
    );
  } else if (fail?.status === 503) {
    body = (
      <Message text="Can't reach Context Tree right now.">
        <button className="br-btn" onClick={() => { setFailure(null); setAttempt((n) => n + 1); }}>Try again</button>
      </Message>
    );
  } else {
    body = (
      <Board api={api} boardId={boardId} onOpenBoard={onOpenBoard} onOpenSettings={onOpenSettings} initialAsk={initialAsk} defaultModel={preferredModel(statuses) ?? undefined} keyEpoch={keys.lastSaved ?? undefined} isModelLocked={isModelLocked} liveModels={liveModels} topRight={<AccountPill />} />
    );
  }
  return <LightScope>{body}</LightScope>;
}

export function BoardRoute({ boardId, mock = false }: { boardId: string; mock?: boolean }): ReactElement {
  return (
    <ShellProvider mock={mock}>
      <BoardRouteInner boardId={boardId} mock={mock} />
    </ShellProvider>
  );
}

export function BoardsRoute({ mock = false }: { mock?: boolean }): ReactElement {
  const gate = useSessionGate(mock, '/boards');
  const api = useEngineApi(mock);
  return (
    <ShellProvider mock={mock}>
      <LightScope bg={HOME_BG}>
        {gate === 'loading' || !api ? <Splash /> : <BoardsHome api={api} query={mock ? '?api=mock' : ''} />}
      </LightScope>
    </ShellProvider>
  );
}
