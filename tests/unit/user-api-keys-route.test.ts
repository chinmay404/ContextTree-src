import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const getCurrentUser = vi.fn();
vi.mock('@/lib/auth-utils', () => ({ getCurrentUser: () => getCurrentUser() }));

const mongo = {
  getUserApiKeyStatuses: vi.fn(),
  getUserApiKeyRecord: vi.fn(),
  upsertUserApiKey: vi.fn(),
  setUserApiKeyCheck: vi.fn(),
  deleteUserApiKey: vi.fn(),
};
vi.mock('@/lib/mongodb', () => ({ mongoService: mongo }));

const checkProviderKey = vi.fn();
vi.mock('@/lib/key-check', () => ({ checkProviderKey: (...a: unknown[]) => checkProviderKey(...a) }));

const decryptApiKey = vi.fn();
vi.mock('@/lib/byok-crypto', async () => {
  const actual = await vi.importActual<typeof import('@/lib/byok-crypto')>('@/lib/byok-crypto');
  return { ...actual, encryptApiKey: (k: string) => `ENC(${k.length})`, decryptApiKey: (p: string) => decryptApiKey(p) };
});

const FAKE = 'sk-test-FAKEKEY-abcd1234';
const EMAIL = 'sam.rivera@example.com';

async function load() {
  vi.resetModules();
  const main = await import('@/app/api/user-api-keys/route');
  const check = await import('@/app/api/user-api-keys/check/route');
  return { main, check };
}

const post = (body: unknown) =>
  new Request('http://x/api/user-api-keys', { method: 'POST', body: JSON.stringify(body) }) as unknown as import('next/server').NextRequest;
const checkReq = (body: unknown = {}) =>
  new Request('http://x/api/user-api-keys/check', { method: 'POST', body: JSON.stringify(body) }) as unknown as import('next/server').NextRequest;

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUser.mockResolvedValue({ email: EMAIL });
  mongo.getUserApiKeyStatuses.mockResolvedValue([]);
  mongo.upsertUserApiKey.mockImplementation(async (_e: string, provider: string, _enc: string, hint: string, metadata: unknown) => ({
    provider, key_hint: hint, metadata, updated_at: '2026-10-21T10:00:00.000Z',
  }));
  mongo.setUserApiKeyCheck.mockResolvedValue(true);
  checkProviderKey.mockResolvedValue('ok');
});

describe('GET', () => {
  it('401 without a session', async () => {
    getCurrentUser.mockResolvedValue(undefined);
    const { main } = await load();
    expect((await main.GET()).status).toBe(401);
  });

  it('lists the seven V3 providers plus V2 ones, with last4/status/checkedAt mapped', async () => {
    mongo.getUserApiKeyStatuses.mockResolvedValue([
      { provider: 'google', key_hint: 'Google ••••wxyz', metadata: { keyCheck: { status: 'ok', checkedAt: '2026-10-21T09:00:00.000Z' } }, updated_at: '2026-10-21T08:00:00.000Z' },
      { provider: 'openai', key_hint: 'OpenAI ••••1234', metadata: {}, updated_at: '2026-10-20T08:00:00.000Z' },
    ]);
    const { main } = await load();
    const res = await main.GET();
    const { providers } = await res.json();
    expect(Object.keys(providers).sort()).toEqual(['anthropic', 'deepseek', 'google', 'groq', 'litellm', 'mistral', 'moonshot', 'openai']);
    expect(providers.google).toMatchObject({ configured: true, last4: 'wxyz', status: 'ok', checkedAt: '2026-10-21T09:00:00.000Z' });
    expect(providers.openai).toMatchObject({ configured: true, last4: '1234', status: null, checkedAt: null });
    expect(providers.groq).toMatchObject({ configured: false, last4: null, status: null });
  });

  it('never carries a key or ciphertext', async () => {
    mongo.getUserApiKeyStatuses.mockResolvedValue([
      { provider: 'groq', key_hint: 'Groq ••••abcd', encrypted_key: 'SECRETCIPHER', metadata: {}, updated_at: null },
    ]);
    const { main } = await load();
    const text = JSON.stringify(await (await main.GET()).json());
    expect(text).not.toContain('SECRETCIPHER');
    expect(text).not.toContain('encrypted');
  });
});

describe('POST', () => {
  it('422 key_rejected with the exact copy, nothing saved', async () => {
    checkProviderKey.mockResolvedValue('rejected');
    const { main } = await load();
    const res = await main.POST(post({ provider: 'google', apiKey: FAKE }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body).toEqual({ code: 'key_rejected', error: 'Google turned this key down. Check that you copied all of it.' });
    expect(mongo.upsertUserApiKey).not.toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toContain(FAKE);
  });

  it('ok key is saved with keyCheck metadata and the response omits the key', async () => {
    const { main } = await load();
    const res = await main.POST(post({ provider: 'moonshot', apiKey: FAKE }));
    expect(res.status).toBe(200);
    const meta = mongo.upsertUserApiKey.mock.calls[0][4] as { keyCheck: { status: string; checkedAt: string } };
    expect(meta.keyCheck.status).toBe('ok');
    expect(typeof meta.keyCheck.checkedAt).toBe('string');
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain(FAKE);
    expect(JSON.parse(text)).toMatchObject({ provider: 'moonshot', configured: true, last4: '1234', status: 'ok' });
  });

  it('unchecked key is still saved', async () => {
    checkProviderKey.mockResolvedValue('unchecked');
    const { main } = await load();
    const res = await main.POST(post({ provider: 'deepseek', apiKey: FAKE }));
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe('unchecked');
    expect(mongo.upsertUserApiKey).toHaveBeenCalledTimes(1);
  });

  it('litellm is not checked and keeps apiBase', async () => {
    const { main } = await load();
    const res = await main.POST(post({ provider: 'litellm', apiKey: FAKE, apiBase: 'https://llm.example.com/v1' }));
    expect(res.status).toBe(200);
    expect(checkProviderKey).not.toHaveBeenCalled();
    expect(mongo.upsertUserApiKey.mock.calls[0][4]).toEqual({ apiBase: 'https://llm.example.com/v1' });
  });

  it('400 for an unknown provider', async () => {
    const { main } = await load();
    expect((await main.POST(post({ provider: 'bogus', apiKey: FAKE }))).status).toBe(400);
  });

  it('401 without a session', async () => {
    getCurrentUser.mockResolvedValue(undefined);
    const { main } = await load();
    expect((await main.POST(post({ provider: 'groq', apiKey: FAKE }))).status).toBe(401);
  });
});

describe('POST /check', () => {
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
  const row = (provider: string, checkedAt?: string) => ({
    provider, key_hint: `${provider} ••••abcd`, metadata: checkedAt ? { keyCheck: { status: 'ok', checkedAt } } : {}, updated_at: null,
  });

  beforeEach(() => {
    mongo.getUserApiKeyRecord.mockImplementation(async (_e: string, p: string) => ({ provider: p, encrypted_key: `CIPHER-${p}` }));
    decryptApiKey.mockReturnValue(FAKE);
  });

  it('skips a key checked an hour ago unless force', async () => {
    mongo.getUserApiKeyStatuses.mockResolvedValue([row('openai', hoursAgo(1)), row('groq', hoursAgo(30)), row('mistral')]);
    const { check } = await load();
    await check.POST(checkReq({}));
    expect(checkProviderKey.mock.calls.map((c) => c[0]).sort()).toEqual(['groq', 'mistral']);

    checkProviderKey.mockClear();
    await check.POST(checkReq({ force: true }));
    expect(checkProviderKey.mock.calls.map((c) => c[0]).sort()).toEqual(['groq', 'mistral', 'openai']);
  });

  it('stores a rejected result', async () => {
    mongo.getUserApiKeyStatuses.mockResolvedValue([row('groq')]);
    checkProviderKey.mockResolvedValue('rejected');
    const { check } = await load();
    await check.POST(checkReq({}));
    expect(mongo.setUserApiKeyCheck).toHaveBeenCalledWith(EMAIL, 'groq', expect.objectContaining({ status: 'rejected' }));
  });

  it('a decrypt failure becomes unchecked', async () => {
    mongo.getUserApiKeyStatuses.mockResolvedValue([row('groq')]);
    decryptApiKey.mockImplementation(() => { throw new Error('bad payload'); });
    const { check } = await load();
    const res = await check.POST(checkReq({}));
    expect(res.status).toBe(200);
    expect(checkProviderKey).not.toHaveBeenCalled();
    expect(mongo.setUserApiKeyCheck).toHaveBeenCalledWith(EMAIL, 'groq', expect.objectContaining({ status: 'unchecked' }));
  });

  it('never returns a key', async () => {
    mongo.getUserApiKeyStatuses.mockResolvedValue([row('groq')]);
    const { check } = await load();
    const text = JSON.stringify(await (await check.POST(checkReq({ force: true }))).json());
    expect(text).not.toContain(FAKE);
    expect(text).not.toContain('CIPHER');
  });

  it('401 without a session', async () => {
    getCurrentUser.mockResolvedValue(undefined);
    const { check } = await load();
    expect((await check.POST(checkReq({}))).status).toBe(401);
  });

  it('the 11th call in a minute is 429 rate_limited', async () => {
    const { check } = await load();
    for (let i = 0; i < 10; i++) expect((await check.POST(checkReq({}))).status).toBe(200);
    const res = await check.POST(checkReq({}));
    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe('rate_limited');
  });
});
