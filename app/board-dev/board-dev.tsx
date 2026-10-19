'use client';

export interface BoardDevParams {
  ingestMs?: number;
  firstTokenMs?: number;
  wordMs?: number;
  latencyMs?: number;
  toastMs?: number;
}

// Placeholder; Task 9 replaces this body with the mounted board.
export default function BoardDev(_props: { params: BoardDevParams }) {
  return <div data-pb="board-dev" />;
}
