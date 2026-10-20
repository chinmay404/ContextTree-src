import { MockEngineApi } from './mock/mock-engine-api';

declare global {
  interface Window { __mock?: MockEngineApi }
}

let shared: MockEngineApi | null = null;

/**
 * One MockEngineApi per page load, so /boards and /b/<id> see the same boards while navigating client-side.
 * Dev only (?api=mock): board-route loads this module through a NODE_ENV-guarded dynamic import, so production
 * bundles contain neither the mock nor its seed. Exposed as window.__mock for e2e assertions.
 */
export function getSharedMockApi(): MockEngineApi {
  if (!shared) {
    shared = new MockEngineApi();
    if (typeof window !== 'undefined') window.__mock = shared;
  }
  return shared;
}
