import { KeyError, emptyStatus, type KeyStore } from './key-store';
import type { KeyStatus, KeyStatusMap, ProviderId } from './status-types';

export interface KeyViewState {
  statuses: KeyStatusMap | null;
  error: KeyError | null;
  lastSaved: { provider: ProviderId; at: number } | null;
}

const asKeyError = (e: unknown) => (e instanceof KeyError ? e : new KeyError('failed', "Couldn't reach Context Tree. Try again."));

/** The state machine behind useKeyStatus. Framework free, so it is testable in node. */
export class KeyController {
  private state: KeyViewState = { statuses: null, error: null, lastSaved: null };
  private readonly listeners = new Set<() => void>();
  constructor(private readonly store: KeyStore, private readonly now: () => number = Date.now) {}

  getSnapshot = (): KeyViewState => this.state;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  };

  private set(patch: Partial<KeyViewState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  async refresh(): Promise<void> {
    try { this.set({ statuses: await this.store.status(), error: null }); }
    catch (e) { this.set({ error: asKeyError(e) }); }
  }

  async check(force = false): Promise<void> {
    try { this.set({ statuses: await this.store.check(force), error: null }); }
    catch (e) { this.set({ error: asKeyError(e) }); }
  }

  /** Throws a KeyError (for the sheet to show inline); also records it in `error`. */
  async save(p: ProviderId, apiKey: string): Promise<KeyStatus> {
    try {
      const saved = await this.store.save(p, apiKey);
      const base = this.state.statuses ?? ({} as KeyStatusMap);
      this.set({ statuses: { ...base, [p]: saved }, error: null, lastSaved: { provider: p, at: this.now() } });
      return saved;
    } catch (e) {
      const err = asKeyError(e);
      this.set({ error: err });
      throw err;
    }
  }

  async remove(p: ProviderId): Promise<void> {
    try {
      await this.store.remove(p);
      const base = this.state.statuses ?? ({} as KeyStatusMap);
      this.set({ statuses: { ...base, [p]: emptyStatus(p) }, error: null });
    } catch (e) {
      const err = asKeyError(e);
      this.set({ error: err });
      throw err;
    }
  }
}
