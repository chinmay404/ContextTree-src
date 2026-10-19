'use client';
import { useEffect, useState } from 'react';
import { Board } from '../../components/board/Board';
import { MockEngineApi, SEED_BOARD_ID } from '../../components/board/api/mock/mock-engine-api';

export interface BoardDevParams {
  ingestMs?: number;
  firstTokenMs?: number;
  wordMs?: number;
  latencyMs?: number;
  toastMs?: number;
}

declare global {
  interface Window { __mock?: MockEngineApi; __remount?: () => void }
}

/** The board on MockEngineApi (seed board), one mock per page load. Dev only: page.tsx 404s in production. */
export default function BoardDev({ params }: { params: BoardDevParams }) {
  const [api] = useState(() => new MockEngineApi(params));
  const [boardId, setBoardId] = useState<string>(SEED_BOARD_ID);
  const [gen, setGen] = useState(0);

  // Test seams: the mock itself, and a remount of <Board> on the same mock (a "reload" that keeps server state).
  useEffect(() => {
    window.__mock = api;
    window.__remount = () => setGen((g) => g + 1);
    return () => { delete window.__mock; delete window.__remount; };
  }, [api]);

  return (
    <div data-pb="board-dev" style={{ position: 'fixed', inset: 0 }}>
      <Board key={gen} api={api} boardId={boardId} testHook onOpenBoard={setBoardId} />
    </div>
  );
}
