import { MockEngineApi } from './mock/mock-engine-api';

let shared: MockEngineApi | null = null;

/** One MockEngineApi per page load, so /boards and /b/<id> see the same boards while navigating client-side. Dev only (?api=mock). */
export function getSharedMockApi(): MockEngineApi {
  return (shared ??= new MockEngineApi());
}
