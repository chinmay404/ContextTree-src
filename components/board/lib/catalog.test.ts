import { MODELS, PROVIDER_NAME, modelInfo, providerOf, type ModelKey } from './catalog';

const keys = Object.keys(MODELS) as ModelKey[];

describe('model catalog', () => {
  it('gives every model a provider, and the seven providers are each used exactly once', () => {
    const used = keys.map((k) => MODELS[k].provider).sort();
    expect(used).toEqual(['anthropic', 'deepseek', 'google', 'groq', 'mistral', 'moonshot', 'openai']);
    expect(Object.keys(PROVIDER_NAME).sort()).toEqual(used);
    expect(PROVIDER_NAME).toMatchObject({ anthropic: 'Anthropic', openai: 'OpenAI', google: 'Google', groq: 'Groq', deepseek: 'DeepSeek', mistral: 'Mistral', moonshot: 'Moonshot' });
  });

  it('uses the engine ids that run on the user key', () => {
    expect(Object.fromEntries(keys.map((k) => [k, MODELS[k].engineId]))).toEqual({
      claude: 'anthropic/claude-sonnet-4-20250514',
      gpt: 'openai/gpt-5-mini',
      gemini: 'gemini/gemini-3-flash-preview',
      llama: 'meta-llama/llama-4-maverick-17b-128e-instruct',
      deepseek: 'deepseek/deepseek-chat',
      mistral: 'mistral/mistral-large-latest',
      kimi: 'moonshot/kimi-k2-0905-preview',
    });
  });

  it('shows the detailed model name and keeps a short label for tight spots', () => {
    expect(Object.fromEntries(keys.map((k) => [k, MODELS[k].name]))).toEqual({
      claude: 'Claude Sonnet 4', gpt: 'GPT-5 mini', gemini: 'Gemini 3 Flash', llama: 'Llama 4 Maverick',
      deepseek: 'DeepSeek V3', mistral: 'Mistral Large', kimi: 'Kimi K2',
    });
    expect(Object.fromEntries(keys.map((k) => [k, MODELS[k].label]))).toMatchObject({ claude: 'Claude', gpt: 'GPT', gemini: 'Gemini', kimi: 'Kimi' });
    expect(modelInfo(MODELS.gpt.engineId)).toMatchObject({ key: 'gpt', name: 'GPT-5 mini', label: 'GPT' });
  });

  it.each([
    ['openai/gpt-oss-120b', 'groq'], ['deepseek-ai/deepseek-v4-pro', 'deepseek'], ['mistralai/x', 'mistral'],
    ['moonshotai/kimi-k2-instruct', 'moonshot'], ['gemini/gemini-2.5-pro', 'google'], ['z-ai/glm-5.2', null], ['litellm/x', null],
    ['openai/gpt-5', 'openai'], ['anthropic/claude-opus-4', 'anthropic'], ['', null],
  ])('providerOf(%s) is %s', (id, want) => {
    expect(providerOf(id)).toBe(want);
  });

  it('providerOf finds every catalog model first', () => {
    for (const k of keys) expect(providerOf(MODELS[k].engineId)).toBe(MODELS[k].provider);
  });

  it('modelInfo of an unknown id is still readable', () => {
    const m = modelInfo('deepseek-ai/deepseek-v4-pro');
    expect(m).toMatchObject({ key: null, label: 'deepseek-v4-pro', name: 'deepseek-v4-pro' });
  });
});
