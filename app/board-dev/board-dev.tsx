'use client';
import { useEffect, useState } from 'react';
import type { ProviderId } from '../../components/board/api/types';
import { MODELS, type ModelKey } from '../../components/board/lib/catalog';
import { Board } from '../../components/board/Board';
import { MockEngineApi, SEED_BOARD_ID } from '../../components/board/api/mock/mock-engine-api';

export interface BoardDevParams {
  ingestMs?: number;
  firstTokenMs?: number;
  wordMs?: number;
  latencyMs?: number;
  /** `?ask=…`: the shell's first question (Board `initialAsk`); only does something on a `fresh` board. */
  ask?: string;
  /** `?model=gemini`: a MODELS key handed to Board as `defaultModel`. */
  model?: string;
  /** `?fresh=1`: start on a new empty board (`b_fresh`) instead of the seed. */
  fresh?: boolean;
  /** `?keys=1`: hand Board an `onOpenSettings` that records its calls in `window.__openSettings.calls`. Off by default: it adds an API keys item to the logo menu. */
  keys?: boolean;
}

declare global {
  interface Window { __mock?: MockEngineApi; __remount?: () => void; __openSettings?: { calls: (string | undefined)[] }; __keySaved?: (provider: ProviderId) => void }
}

/** The board on MockEngineApi (seed board), one mock per page load. Dev only: page.tsx 404s in production. */
export default function BoardDev({ params }: { params: BoardDevParams }) {
  const [api] = useState(() => new MockEngineApi(params));
  const [boardId, setBoardId] = useState<string>(params.fresh ? 'b_fresh' : SEED_BOARD_ID);
  const [ready, setReady] = useState(!params.fresh);
  const [gen, setGen] = useState(0);

  // Test seams: the mock itself, and a remount of <Board> on the same mock (a "reload" that keeps server state).
  useEffect(() => {
    window.__mock = api;
    window.__remount = () => setGen((g) => g + 1);
    return () => { delete window.__mock; delete window.__remount; };
  }, [api]);

  useEffect(() => {
    if (!params.fresh) return;
    let live = true;
    void api.createBoard({ id: 'b_fresh', title: 'A new board' }).then(() => { if (live) setReady(true); });
    return () => { live = false; };
  }, [api, params.fresh]);

  // Spy on the keys sheet requests, for specs.
  const [spy] = useState(() => ({ calls: [] as (string | undefined)[] }));
  useEffect(() => { window.__openSettings = spy; return () => { delete window.__openSettings; }; }, [spy]);

  // Test seam: pretend the keys sheet saved a key for `provider` (Board `keyEpoch`).
  const [keyEpoch, setKeyEpoch] = useState<{ provider: ProviderId; at: number } | undefined>();
  useEffect(() => {
    window.__keySaved = (provider) => setKeyEpoch((k) => ({ provider, at: (k?.at ?? 0) + 1 }));
    return () => { delete window.__keySaved; };
  }, []);

  const defaultModel = params.model && params.model in MODELS ? MODELS[params.model as ModelKey].engineId : undefined;
  return (
    <div data-pb="board-dev" style={{ position: 'fixed', inset: 0 }}>
      {ready && <Board key={gen} api={api} boardId={boardId} testHook onOpenBoard={setBoardId}
        initialAsk={params.ask} keyEpoch={keyEpoch} defaultModel={defaultModel} onOpenSettings={params.keys ? (p) => { spy.calls.push(p); } : undefined} />}
    </div>
  );
}
