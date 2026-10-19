import type { EngineContext, PersistenceModule } from './types';

/** Position and viewport saves after the springs settle (Task 18 fills this in). */
export function createPersistence(_ctx: EngineContext): PersistenceModule {
  return { frame() {}, isDirty: () => false, dispose() {} };
}
