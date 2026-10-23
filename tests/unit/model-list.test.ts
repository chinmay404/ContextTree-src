import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { listProviderModels } from '@/lib/model-list';

const FAKE = 'sk-test-FAKEKEY-0000000000000000';

function fakeFetch(body: unknown, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }));
}

const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe('listProviderModels', () => {
  it('keeps Groq chat models and drops speech, TTS and guard models', async () => {
    const f = fakeFetch({ data: [
      { id: 'openai/gpt-oss-120b', active: true }, { id: 'qwen/qwen3.8-27b', active: true },
      { id: 'whisper-large-v3', active: true }, { id: 'canopylabs/orpheus-v1-english', active: true },
      { id: 'meta-llama/llama-prompt-guard-2-22m', active: true }, { id: 'openai/gpt-oss-safeguard-20b', active: true },
      { id: 'old-model', active: false },
    ] });
    const out = await listProviderModels('groq', FAKE, { fetch: f as unknown as typeof fetch });
    expect(ids(out).sort()).toEqual(['groq:openai/gpt-oss-120b', 'groq:qwen/qwen3.8-27b']);
    expect(out.find((m) => m.id === 'groq:qwen/qwen3.8-27b')?.name).toBe('qwen3.8-27b');
  });

  it('sends the key in a header only, to the full list', async () => {
    const f = fakeFetch({ data: [] });
    await listProviderModels('groq', FAKE, { fetch: f as unknown as typeof fetch });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.groq.com/openai/v1/models');
    expect(url).not.toContain(FAKE);
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${FAKE}`);
  });

  it('keeps OpenAI chat aliases, not snapshots or non-chat models', async () => {
    const f = fakeFetch({ data: ['gpt-5', 'gpt-5-mini', 'gpt-5-2025-08-07', 'gpt-5-pro', 'gpt-4o-audio-preview', 'text-embedding-3-small',
      'dall-e-3', 'o3', 'gpt-realtime', 'gpt-5-codex', 'gpt-image-1', 'tts-1'].map((id) => ({ id })) });
    const out = await listProviderModels('openai', FAKE, { fetch: f as unknown as typeof fetch });
    expect(ids(out).sort()).toEqual(['openai:gpt-5', 'openai:gpt-5-mini', 'openai:o3']);
  });

  it('keeps Gemini text models with their display names', async () => {
    const f = fakeFetch({ models: [
      { name: 'models/gemini-2.5-pro', displayName: 'Gemini 2.5 Pro', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-2.5-flash-image', displayName: 'Image', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] },
      { name: 'models/gemma-3-27b-it', supportedGenerationMethods: ['generateContent'] },
    ] });
    const out = await listProviderModels('google', FAKE, { fetch: f as unknown as typeof fetch });
    expect(out).toEqual([{ id: 'google:gemini-2.5-pro', name: 'Gemini 2.5 Pro' }]);
  });

  it('uses Anthropic display names', async () => {
    const f = fakeFetch({ data: [{ id: 'claude-opus-4-1-20250805', display_name: 'Claude Opus 4.1' }] });
    expect(await listProviderModels('anthropic', FAKE, { fetch: f as unknown as typeof fetch }))
      .toEqual([{ id: 'anthropic:claude-opus-4-1-20250805', name: 'Claude Opus 4.1' }]);
  });

  it('skips ids the engine would not route', async () => {
    const f = fakeFetch({ data: [{ id: 'ok-model' }, { id: '../x' }, { id: 'has space' }, { id: 'a'.repeat(200) }] });
    expect(ids(await listProviderModels('deepseek', FAKE, { fetch: f as unknown as typeof fetch }))).toEqual(['deepseek:ok-model']);
  });

  it('throws with the status only when the provider refuses', async () => {
    const f = fakeFetch({ error: { message: `bad key ${FAKE}` } }, 401);
    await expect(listProviderModels('groq', FAKE, { fetch: f as unknown as typeof fetch })).rejects.toThrow(/^http 401$/);
  });
});
