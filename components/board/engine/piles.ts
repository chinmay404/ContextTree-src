import type { EngineContext, PilesModule } from './types';

/** Piles: hover target, drop, wheel flip, unstack (Task 12 fills this in). */
export function createPiles(ctx: EngineContext): PilesModule {
  return {
    hoverTarget: () => null, drop() {}, onWheel: () => false, cycle() {},
    front: (id) => ctx.nodes.get(id)?.front ?? 0, unstack() {}, dispose() {},
  };
}
