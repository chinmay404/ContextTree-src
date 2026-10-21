import { V3_KEY_PROVIDERS } from '@/lib/byok';
import type { KeyState, KeyStatus, KeyStatusMap, ProviderId } from './status-types';

export type KeyErrorCode = 'key_rejected' | 'unauthorized' | 'rate_limited' | 'failed';

/** A key-store failure. The message is user-safe copy and never contains a key. */
export class KeyError extends Error {
  code: KeyErrorCode;
  status: number;
  constructor(code: KeyErrorCode, message: string, status = 0) {
    super(message);
    this.name = 'KeyError';
    this.code = code;
    this.status = status;
  }
}

export interface KeyStore {
  status(): Promise<KeyStatusMap>;
  check(force?: boolean): Promise<KeyStatusMap>;
  save(p: ProviderId, apiKey: string): Promise<KeyStatus>;
  remove(p: ProviderId): Promise<void>;
}

export function emptyStatus(provider: ProviderId): KeyStatus {
  return { provider, configured: false, last4: null, status: null, checkedAt: null, updatedAt: null };
}

export function emptyStatusMap(): KeyStatusMap {
  return Object.fromEntries(V3_KEY_PROVIDERS.map((p) => [p, emptyStatus(p)])) as KeyStatusMap;
}

const STATES: KeyState[] = ['ok', 'rejected', 'unchecked'];

function toStatus(provider: ProviderId, raw: Record<string, unknown> | undefined): KeyStatus {
  if (!raw || raw.configured !== true) return emptyStatus(provider);
  return {
    provider,
    configured: true,
    last4: typeof raw.last4 === 'string' ? raw.last4 : null,
    status: STATES.includes(raw.status as KeyState) ? (raw.status as KeyState) : null,
    checkedAt: typeof raw.checkedAt === 'string' ? raw.checkedAt : null,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
  };
}

function toMap(body: unknown): KeyStatusMap {
  const providers = (body as { providers?: Record<string, Record<string, unknown>> } | null)?.providers ?? {};
  return Object.fromEntries(V3_KEY_PROVIDERS.map((p) => [p, toStatus(p, providers[p])])) as KeyStatusMap;
}

const REJECTED_COPY = 'This key was turned down. Check that you copied all of it.';
const COPY = {
  unauthorized: 'Sign in again to manage your keys.',
  rate_limited: 'Too many tries. Wait a minute and try again.',
  failed: "Couldn't reach Context Tree. Try again.",
} as const;

export class HttpKeyStore implements KeyStore {
  constructor(private readonly doFetch: typeof fetch = (...a) => fetch(...a)) {}

  private async call(path: string, init?: RequestInit, secret?: string): Promise<unknown> {
    let res: Response;
    try {
      res = await this.doFetch(path, { ...init, headers: { 'Content-Type': 'application/json' }, cache: 'no-store' });
    } catch {
      throw new KeyError('failed', COPY.failed);
    }
    const body = await res.json().catch(() => null);
    if (res.ok) return body;
    if (res.status === 422 && body?.code === 'key_rejected') {
      let text = typeof body.error === 'string' ? body.error : REJECTED_COPY;
      if (secret && text.includes(secret)) text = REJECTED_COPY;
      throw new KeyError('key_rejected', text, 422);
    }
    if (res.status === 400 && typeof body?.error === 'string') throw new KeyError('failed', body.error, 400);
    if (res.status === 401) throw new KeyError('unauthorized', COPY.unauthorized, 401);
    if (res.status === 429) throw new KeyError('rate_limited', COPY.rate_limited, 429);
    throw new KeyError('failed', COPY.failed, res.status);
  }

  async status(): Promise<KeyStatusMap> {
    return toMap(await this.call('/api/user-api-keys'));
  }

  async check(force = false): Promise<KeyStatusMap> {
    return toMap(await this.call('/api/user-api-keys/check', { method: 'POST', body: JSON.stringify({ force }) }));
  }

  async save(p: ProviderId, apiKey: string): Promise<KeyStatus> {
    const body = await this.call('/api/user-api-keys', { method: 'POST', body: JSON.stringify({ provider: p, apiKey }) }, apiKey);
    return toStatus(p, body as Record<string, unknown>);
  }

  async remove(p: ProviderId): Promise<void> {
    await this.call('/api/user-api-keys', { method: 'DELETE', body: JSON.stringify({ provider: p }) });
  }
}
