import type { EngineContext, StringsModule } from './types';

/** Tubes, wires, Disconnect and the live string (Task 11 fills this in). */
export function createStrings(_ctx: EngineContext): StringsModule {
  return {
    frame() {}, startString() {}, isLive: () => false, wireKeys: () => [], selectedWire: () => null, clearWire: () => false,
    wirePillOn: () => false, wirePoint: () => null, clickDisconnect() {}, stringMid: () => null, dispose() {},
  };
}
