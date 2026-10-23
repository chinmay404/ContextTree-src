import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { KEY_CHECKS, KEY_CHECK_TIMEOUT_MS, checkProviderKey } from '@/lib/key-check';
import { V3_KEY_PROVIDERS } from '@/lib/byok';

const FAKE = 'sk-test-FAKEKEY-0000000000000000';

const URLS: Record<string, string> = {
  anthropic: 'https://api.anthropic.com/v1/models?limit=1',
  openai: 'https://api.openai.com/v1/models',
  google: 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1',
  groq: 'https://api.groq.com/openai/v1/models',
  deepseek: 'https://api.deepseek.com/models',
  mistral: 'https://api.mistral.ai/v1/models',
  moonshot: 'https://api.moonshot.ai/v1/models',
};

function fakeFetch(status: number, body = '{}') {
  return vi.fn(async (_url: unknown, _init?: unknown) => new Response(body, { status }));
}

describe('KEY_CHECKS table', () => {
  it('covers exactly the seven providers with the documented urls', () => {
    expect(Object.keys(KEY_CHECKS).sort()).toEqual([...V3_KEY_PROVIDERS].sort());
    for (const p of V3_KEY_PROVIDERS) expect(KEY_CHECKS[p].url).toBe(URLS[p]);
  });
  it('uses a 5 second timeout', () => {
    expect(KEY_CHECK_TIMEOUT_MS).toBe(5000);
  });
});

describe.each(V3_KEY_PROVIDERS)('checkProviderKey(%s)', (provider) => {
  it('requests the exact url with the key in a header', async () => {
    const f = fakeFetch(200);
    await checkProviderKey(provider, FAKE, { fetch: f as unknown as typeof fetch });
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(URLS[provider]);
    expect(url).not.toContain(FAKE);
    expect(init.method ?? 'GET').toBe('GET');
    expect(Object.values(init.headers as Record<string, string>).some((v) => v.includes(FAKE))).toBe(true);
    if (provider === 'anthropic') expect((init.headers as Record<string, string>)['anthropic-version']).toBe('2023-06-01');
    if (provider === 'google') expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe(FAKE);
    expect(init.signal).toBeDefined();
  });
  it('200 -> ok', async () => {
    expect(await checkProviderKey(provider, FAKE, { fetch: fakeFetch(200) as unknown as typeof fetch })).toBe('ok');
  });
  it('401 and 403 -> rejected', async () => {
    expect(await checkProviderKey(provider, FAKE, { fetch: fakeFetch(401) as unknown as typeof fetch })).toBe('rejected');
    expect(await checkProviderKey(provider, FAKE, { fetch: fakeFetch(403) as unknown as typeof fetch })).toBe('rejected');
  });
  it('500 -> unchecked', async () => {
    expect(await checkProviderKey(provider, FAKE, { fetch: fakeFetch(500) as unknown as typeof fetch })).toBe('unchecked');
  });
  it('a throw -> unchecked', async () => {
    const f = vi.fn(async () => { throw new Error('boom'); });
    expect(await checkProviderKey(provider, FAKE, { fetch: f as unknown as typeof fetch })).toBe('unchecked');
  });
});

describe('google specifics', () => {
  it('400 with API_KEY_INVALID -> rejected', async () => {
    const body = JSON.stringify({ error: { details: [{ reason: 'API_KEY_INVALID' }] } });
    expect(await checkProviderKey('google', FAKE, { fetch: fakeFetch(400, body) as unknown as typeof fetch })).toBe('rejected');
  });
  it('400 without it -> unchecked', async () => {
    expect(await checkProviderKey('google', FAKE, { fetch: fakeFetch(400, '{"error":{}}') as unknown as typeof fetch })).toBe('unchecked');
  });
});

describe('guards', () => {
  const saved = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  beforeEach(() => { delete process.env.NODE_TLS_REJECT_UNAUTHORIZED; });
  afterEach(() => {
    if (saved === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = saved;
    vi.restoreAllMocks();
  });

  it('TLS verification off -> unchecked with no request', async () => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const f = fakeFetch(200);
    expect(await checkProviderKey('openai', FAKE, { fetch: f as unknown as typeof fetch })).toBe('unchecked');
    expect(f).not.toHaveBeenCalled();
  });

  it('never logs the key', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    const thrower = vi.fn(async () => { throw new Error(`failed with ${FAKE}`); });
    await checkProviderKey('openai', FAKE, { fetch: thrower as unknown as typeof fetch });
    await checkProviderKey('openai', FAKE, { fetch: fakeFetch(401) as unknown as typeof fetch });
    await checkProviderKey('openai', FAKE, { fetch: fakeFetch(200) as unknown as typeof fetch });
    for (const s of spies) expect(JSON.stringify(s.mock.calls)).not.toContain(FAKE);
  });
});
