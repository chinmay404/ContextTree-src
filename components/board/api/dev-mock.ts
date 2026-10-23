import { MockEngineApi } from './mock/mock-engine-api';
import { ApiError, type EngineApi } from './types';

declare global {
  interface Window { __mock?: MockEngineApi }
}

let shared: MockEngineApi | null = null;

/**
 * One MockEngineApi per page load, so /boards and /b/<id> see the same boards while navigating client-side.
 * Dev only (?api=mock): board-route loads this module through a NODE_ENV-guarded dynamic import, so production
 * bundles contain neither the mock nor its seed. Exposed as window.__mock for e2e assertions.
 */
export function getSharedMockApi(opts: { fail?: string; empty?: boolean } = {}): MockEngineApi {
  if (!shared) {
    shared = new MockEngineApi(opts.empty ? { seed: false } : undefined);
    if (opts.fail) shared.failNext(opts.fail as keyof EngineApi, new ApiError(503, 'engine_unavailable'));
    if (typeof window !== 'undefined') window.__mock = shared;
  }
  return shared;
}
