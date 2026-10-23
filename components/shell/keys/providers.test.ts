import { V3_KEY_PROVIDERS } from '@/lib/byok';
import { MODELS, type ModelKey } from '@/components/board/lib/catalog';
import { emptyStatusMap } from './key-store';
import { PROVIDERS, hasWorkingKey, isModelLocked, keyStatusLine, pickerPreview, preferredModel } from './providers';
import type { KeyState, KeyStatusMap, ProviderId } from './status-types';

function keys(entries: [ProviderId, KeyState | null][]): KeyStatusMap {
  const m = emptyStatusMap();
  for (const [p, status] of entries) m[p] = { ...m[p], configured: true, status };
  return m;
}

describe('PROVIDERS', () => {
  it('has the seven ids in order', () => {
    expect(PROVIDERS.map((p) => p.id)).toEqual([...V3_KEY_PROVIDERS]);
  });
  it('lists every model exactly once, under its own provider', () => {
    const seen = PROVIDERS.flatMap((p) => p.models.map((k) => [k, p.id] as const));
    expect(seen).toHaveLength(Object.keys(MODELS).length);
    for (const [k, id] of seen) expect(MODELS[k as ModelKey].provider).toBe(id);
  });
  it('writes a help line with the host and the provider name', () => {
    const a = PROVIDERS[0];
    expect(a.keyHelp).toBe('Make one at console.anthropic.com/settings/keys — it takes about a minute. We check it with Anthropic before saving.');
  });
});

describe('hasWorkingKey / isModelLocked', () => {
  const claude = MODELS.claude.engineId;
  it('locks without a key, opens with ok or unchecked, locks when rejected', () => {
    expect(isModelLocked(claude, emptyStatusMap())).toBe(true);
    expect(isModelLocked(claude, keys([['anthropic', 'ok']]))).toBe(false);
    expect(isModelLocked(claude, keys([['anthropic', 'unchecked']]))).toBe(false);
    expect(isModelLocked(claude, keys([['anthropic', 'rejected']]))).toBe(true);
  });
  it('an unknown model id is never locked here (the engine says unsupported_model)', () => {
    expect(isModelLocked('z-ai/glm-5.2', null)).toBe(false);
    expect(isModelLocked('z-ai/glm-5.2', emptyStatusMap())).toBe(false);
  });
  it('does not lock while statuses are still loading', () => {
    expect(isModelLocked(claude, null)).toBe(false);
    expect(hasWorkingKey(null, 'anthropic')).toBe(false);
  });
});

describe('preferredModel', () => {
  it('null without keys', () => {
    expect(preferredModel(emptyStatusMap())).toBeNull();
    expect(preferredModel(null)).toBeNull();
  });
  it('the first model with a working key, default first', () => {
    expect(preferredModel(keys([['google', 'ok']]))).toBe(MODELS.gemini.engineId);
    expect(preferredModel(keys([['openai', 'ok'], ['google', 'ok']]))).toBe(MODELS.gpt.engineId);
    expect(preferredModel(keys([['moonshot', 'ok']]))).toBe(MODELS.kimi.engineId);
  });
  it('skips a rejected key', () => {
    expect(preferredModel(keys([['openai', 'rejected'], ['google', 'ok']]))).toBe(MODELS.gemini.engineId);
  });
});

describe('keyStatusLine', () => {
  it('is re-exported', () => {
    expect(keyStatusLine(emptyStatusMap()).text).toBe('No keys yet');
  });
});

describe('pickerPreview', () => {
  it('no keys: nothing ready, all seven need a key', () => {
    const p = pickerPreview(emptyStatusMap());
    expect(p.ready).toEqual([]);
    expect(p.locked).toHaveLength(7);
    expect(p.locked.every((l) => l.reason === 'needs-key')).toBe(true);
  });
  it('a rejected key says fix-key and the preferred ready row is the default', () => {
    const p = pickerPreview(keys([['google', 'ok'], ['openai', 'ok'], ['groq', 'rejected']]));
    expect(p.ready.map((r) => r.key)).toEqual(['gpt', 'gemini']);
    expect(p.ready.find((r) => r.isDefault)?.key).toBe('gpt');
    expect(p.locked.find((l) => l.key === 'gptoss')).toMatchObject({ reason: 'fix-key', providerName: 'Groq' });
    expect(p.locked.find((l) => l.key === 'claude')).toMatchObject({ reason: 'needs-key', providerName: 'Anthropic' });
  });
});
