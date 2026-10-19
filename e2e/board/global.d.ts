import type { BoardTestHook } from '../../components/board/engine/test-hook';

declare global {
  interface Window { __board?: BoardTestHook }
}

export {};
