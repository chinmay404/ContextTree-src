import type { BoardTestHook } from '../../components/board/engine/test-hook';

declare global {
  interface Window { __board?: BoardTestHook; __old?: unknown; __pick?: unknown }
}

/** The parts of the mock engine that specs reach into from the page. */
export interface MockPeek {
  boards: Map<string, { cards: Map<string, { card: { x: number; updatedAt: string } }> }>;
  failNext(method: string, error: unknown): void;
  constructor: { ApiError: new (status: number, code: string) => unknown };
}
