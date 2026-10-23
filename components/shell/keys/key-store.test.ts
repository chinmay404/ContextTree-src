import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpKeyStore, KeyError } from './key-store';
import { KeyController } from './key-controller';
import { MockKeyStore } from '../dev-shell-mock';

const FAKE = 'sk-test-FAKEKEY-abcd1234';

function res(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
function fake(status: number, body: unknown = {}) {
  return vi.fn(async (_u: unknown, _i?: unknown) => res(status, body));
}
const as = (f: unknown) => f as unknown as typeof fetch;

describe('HttpKeyStore', () => {
  it('status() GETs the list and maps the seven providers', async () => {
    const f = fake(200, { providers: { google: { configured: true, last4: 'wxyz', status: 'ok', checkedAt: 'c', updatedAt: 'u' }, litellm: { configured: true } } });
    const map = await new HttpKeyStore(as(f)).status();
    expect(f.mock.calls[0][0]).toBe('/api/user-api-keys');
    expect(Object.keys(map)).toHaveLength(7);
    expect(map.google).toMatchObject({ configured: true, last4: 'wxyz', status: 'ok' });
    expect(map.groq.configured).toBe(false);
    expect('litellm' in map).toBe(false);
  });

  it('check() POSTs /check with force', async () => {
    const f = fake(200, { providers: {} });
    await new HttpKeyStore(as(f)).check(true);
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/user-api-keys/check');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ force: true });
  });

  it('save() POSTs provider and key and returns the status', async () => {
    const f = fake(200, { provider: 'groq', configured: true, last4: '1234', status: 'ok', checkedAt: 'c', updatedAt: 'u' });
    const s = await new HttpKeyStore(as(f)).save('groq', FAKE);
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/user-api-keys');
    expect(JSON.parse(String(init.body))).toEqual({ provider: 'groq', apiKey: FAKE });
    expect(s).toMatchObject({ provider: 'groq', last4: '1234', status: 'ok' });
    expect(JSON.stringify(s)).not.toContain(FAKE);
  });

  it('remove() DELETEs', async () => {
    const f = fake(200, { provider: 'groq', configured: false });
    await new HttpKeyStore(as(f)).remove('groq');
    const [, init] = f.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('DELETE');
    expect(JSON.parse(String(init.body))).toEqual({ provider: 'groq' });
  });

  it('422 becomes key_rejected carrying the server text', async () => {
    const f = fake(422, { code: 'key_rejected', error: 'Google turned this key down. Check that you copied all of it.' });
    const err = await new HttpKeyStore(as(f)).save('google', FAKE).catch((e) => e);
    expect(err).toBeInstanceOf(KeyError);
    expect(err).toMatchObject({ code: 'key_rejected', status: 422, message: 'Google turned this key down. Check that you copied all of it.' });
  });

  it('401, 429, 500 and a throw map to their codes', async () => {
    const codeOf = async (f: unknown) => (await new HttpKeyStore(as(f)).status().catch((e) => e)).code;
    expect(await codeOf(fake(401))).toBe('unauthorized');
    expect(await codeOf(fake(429, { code: 'rate_limited' }))).toBe('rate_limited');
    expect(await codeOf(fake(500))).toBe('failed');
    expect(await codeOf(vi.fn(async () => { throw new TypeError(`network down for ${FAKE}`); }))).toBe('failed');
  });

  it('no thrown message contains the key', async () => {
    const echo = fake(422, { code: 'key_rejected', error: `bad key ${FAKE}` });
    const e1 = await new HttpKeyStore(as(echo)).save('openai', FAKE).catch((e) => e);
    const e2 = await new HttpKeyStore(as(vi.fn(async () => { throw new Error(FAKE); }))).save('openai', FAKE).catch((e) => e);
    expect(e1.message).not.toContain(FAKE);
    expect(e2.message).not.toContain(FAKE);
  });
});

describe('MockKeyStore', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('starts empty, accepts a good key with last4, rejects one containing "bad"', async () => {
    const m = new MockKeyStore({ latencyMs: 0 });
    expect(Object.values(await m.status()).every((s) => !s.configured)).toBe(true);
    const s = await m.save('mistral', FAKE);
    expect(s).toMatchObject({ configured: true, status: 'ok', last4: '1234' });
    expect((await m.status()).mistral.configured).toBe(true);
    const err = await m.save('groq', 'a-bad-key-000000000').catch((e) => e);
    expect(err).toMatchObject({ code: 'key_rejected' });
    expect((await m.status()).groq.configured).toBe(false);
  });

  it('{all:true} starts with all seven working', async () => {
    const m = new MockKeyStore({ all: true, latencyMs: 0 });
    expect(Object.values(await m.status()).every((s) => s.configured && s.status === 'ok')).toBe(true);
  });

  it('keeps window.__mock.setKeys in step on every change', async () => {
    const setKeys = vi.fn();
    vi.stubGlobal('window', { __mock: { setKeys } });
    const m = new MockKeyStore({ latencyMs: 0 });
    await m.save('google', FAKE);
    expect(setKeys).toHaveBeenLastCalledWith(['google']);
    await m.save('openai', FAKE);
    expect(setKeys).toHaveBeenLastCalledWith(['openai', 'google']);
    await m.remove('google');
    expect(setKeys).toHaveBeenLastCalledWith(['openai']);
  });
});

describe('KeyController (behind useKeyStatus)', () => {
  it('refresh loads statuses', async () => {
    const c = new KeyController(new MockKeyStore({ latencyMs: 0 }));
    expect(c.getSnapshot().statuses).toBeNull();
    await c.refresh();
    expect(c.getSnapshot().statuses?.openai.configured).toBe(false);
  });

  it('save sets lastSaved and the new status, and notifies', async () => {
    const c = new KeyController(new MockKeyStore({ latencyMs: 0 }), () => 42);
    await c.refresh();
    const seen = vi.fn();
    c.subscribe(seen);
    await c.save('deepseek', FAKE);
    expect(c.getSnapshot().lastSaved).toEqual({ provider: 'deepseek', at: 42 });
    expect(c.getSnapshot().statuses?.deepseek.configured).toBe(true);
    expect(seen).toHaveBeenCalled();
  });

  it('a rejected save throws, records the error and leaves lastSaved alone', async () => {
    const c = new KeyController(new MockKeyStore({ latencyMs: 0 }));
    await c.refresh();
    await expect(c.save('openai', 'bad-key-00000000')).rejects.toMatchObject({ code: 'key_rejected' });
    expect(c.getSnapshot().error?.code).toBe('key_rejected');
    expect(c.getSnapshot().lastSaved).toBeNull();
  });
});
