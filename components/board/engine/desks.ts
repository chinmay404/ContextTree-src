import type { DesksModule, EngineContext } from './types';

/** Desks under each chat (Task 10 fills this in). */
export function createDesks(_ctx: EngineContext): DesksModule {
  return {
    sync() {}, frame() {}, deskAt: () => null, setHot() {}, onCardDropped() {}, onChatDropped() {},
    fade() {}, deskBox: () => null, dispose() {},
  };
}
