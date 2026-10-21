import { V3_KEY_PROVIDERS } from '@/lib/byok';
import { KeyError, emptyStatus, emptyStatusMap, type KeyStore } from './keys/key-store';
import type { KeyStatus, KeyStatusMap, ProviderId } from './keys/status-types';

/** Dev only (?api=mock), loaded through a NODE_ENV-guarded dynamic import. Fictional person, example.com. */
export const MOCK_USER = { name: 'Sam Rivera', email: 'sam.rivera@example.com' };

declare global {
  interface Window { __mockKeys?: MockKeyStore }
}

type MockEngineKeys = { setKeys?: (providers: ProviderId[]) => void };

export class MockKeyStore implements KeyStore {
  private map: KeyStatusMap = emptyStatusMap();
  private readonly latency: number;

  constructor(opts: { all?: boolean; latencyMs?: number } = {}) {
    this.latency = opts.latencyMs ?? 300;
    if (opts.all) {
      for (const p of V3_KEY_PROVIDERS) this.map[p] = this.okStatus(p, `demo-${p}`);
      this.sync();
    }
  }

  private okStatus(provider: ProviderId, key: string): KeyStatus {
    const at = new Date().toISOString();
    return { provider, configured: true, last4: key.trim().slice(-4), status: 'ok', checkedAt: at, updatedAt: at };
  }
  private wait() { return new Promise<void>((r) => setTimeout(r, this.latency)); }
  /** Keep the mock engine in step, so shell e2e boards answer only for keyed providers, as in production. */
  private sync() {
    if (typeof window === 'undefined') return;
    const eng = (window as unknown as { __mock?: MockEngineKeys }).__mock;
    eng?.setKeys?.(V3_KEY_PROVIDERS.filter((p) => this.map[p].configured && this.map[p].status !== 'rejected'));
  }
  private snapshot(): KeyStatusMap {
    return Object.fromEntries(V3_KEY_PROVIDERS.map((p) => [p, { ...this.map[p] }])) as KeyStatusMap;
  }

  async status() { await this.wait(); return this.snapshot(); }
  async check() { await this.wait(); return this.snapshot(); }
  async save(p: ProviderId, apiKey: string): Promise<KeyStatus> {
    await this.wait();
    if (apiKey.includes('bad')) throw new KeyError('key_rejected', 'This key was turned down. Check that you copied all of it.', 422);
    this.map[p] = this.okStatus(p, apiKey);
    this.sync();
    return { ...this.map[p] };
  }
  async remove(p: ProviderId) {
    await this.wait();
    this.map[p] = emptyStatus(p);
    this.sync();
  }
}

let shared: MockKeyStore | null = null;

/** One store per page load, also on window.__mockKeys for e2e. `?keys=all` starts with all seven working. */
export function getSharedMockKeyStore(): MockKeyStore {
  if (!shared) {
    const all = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('keys') === 'all';
    shared = new MockKeyStore({ all });
    if (typeof window !== 'undefined') window.__mockKeys = shared;
  }
  return shared;
}
