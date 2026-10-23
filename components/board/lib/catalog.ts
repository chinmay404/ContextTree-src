import type { AdvancedSettings, ChatData, ProviderId, SourceType } from '../api/types';

export type Family = 'media' | 'docs' | 'note' | 'web' | 'data' | 'image' | 'mixed' | 'answer';

// Prototype TYPES: audio = prototype `podcast`, pile = prototype `stack`.
export const TYPE_INFO: Record<SourceType, { family: Family; icon: string; label: string }> = {
  video: { family: 'media', icon: 'play', label: 'Video' },
  audio: { family: 'media', icon: 'audio-lines', label: 'Audio' },
  pdf: { family: 'docs', icon: 'file-text', label: 'PDF' },
  doc: { family: 'docs', icon: 'file-pen-line', label: 'Document' },
  note: { family: 'note', icon: 'sticky-note', label: 'Note' },
  web: { family: 'web', icon: 'globe', label: 'Web page' },
  csv: { family: 'data', icon: 'sheet', label: 'Spreadsheet' },
  image: { family: 'image', icon: 'image', label: 'Image' },
  pile: { family: 'docs', icon: 'layers', label: 'Pile' },
};

export const FAMC: Record<Family, [string, string]> = {
  media: ['#F4E3DA', '#B8644A'], docs: ['#F3EBCF', '#9A7B2E'], note: ['#F3DEE4', '#B5547A'], web: ['#DCE9F2', '#3F7FA8'],
  data: ['#E0EBD9', '#4F8A45'], image: ['#DDE3EE', '#5B6F9A'], mixed: ['#ECECF0', '#6E6E73'], answer: ['#ECECF0', '#6E6E73'],
};
export const STRING_COL: Record<Family, string> = {
  media: '#E3B7A3', docs: '#DCCB8C', note: '#E0B3C3', web: '#A9CBE0', data: '#AFCDA3', image: '#AEB9D3', mixed: '#D2D2D7', answer: '#D1D1D6',
};

export type ModelKey = 'claude' | 'gpt' | 'gemini' | 'gptoss' | 'deepseek' | 'mistral' | 'kimi';

export const PROVIDER_NAME: Record<ProviderId, string> = {
  anthropic: 'Anthropic', openai: 'OpenAI', google: 'Google', groq: 'Groq', deepseek: 'DeepSeek', mistral: 'Mistral', moonshot: 'Moonshot',
};

/** `name` is the detailed model name shown on pills, card headers, "answered with" and the picker; `label` is the short
 *  form for tight spots (the zoomed-out map). Colours are the models' identity colours. Each engine id runs on the
 *  user's own key for `provider` (app-shell plan, "Model routes"). */
export const MODELS: Record<ModelKey, { label: string; name: string; color: string; engineId: string; provider: ProviderId }> = {
  claude: { label: 'Claude', name: 'Claude Sonnet 4', color: '#E0673A', engineId: 'anthropic/claude-sonnet-4-20250514', provider: 'anthropic' },
  gpt: { label: 'GPT', name: 'GPT-5 mini', color: '#3FAE5A', engineId: 'openai/gpt-5-mini', provider: 'openai' },
  gemini: { label: 'Gemini', name: 'Gemini 3 Flash', color: '#2A86C4', engineId: 'gemini/gemini-3-flash-preview', provider: 'google' },
  gptoss: { label: 'GPT-OSS', name: 'GPT-OSS 120B', color: '#7A52D6', engineId: 'openai/gpt-oss-120b', provider: 'groq' },
  deepseek: { label: 'DeepSeek', name: 'DeepSeek V3', color: '#3B6FD8', engineId: 'deepseek/deepseek-chat', provider: 'deepseek' },
  mistral: { label: 'Mistral', name: 'Mistral Large', color: '#E2A72A', engineId: 'mistral/mistral-large-latest', provider: 'mistral' },
  kimi: { label: 'Kimi', name: 'Kimi K2', color: '#D1467E', engineId: 'moonshot/kimi-k2-0905-preview', provider: 'moonshot' },
};

export const MAIN_MODELS: ModelKey[] = ['claude', 'gpt', 'gemini'];
// The shell passes a `defaultModel` that has a key (app-shell plan, Task 3); this is the fallback.
export const DEFAULT_MODEL_KEY: ModelKey = 'gpt';

// Legacy ids on chats that already exist. Longest prefix first: Groq-hosted `openai/gpt-oss-*` before `openai/`.
const LEGACY_PROVIDER: [string, ProviderId][] = [
  ['openai/gpt-oss', 'groq'], ['openai/', 'openai'], ['anthropic/', 'anthropic'], ['gemini/', 'google'], ['meta-llama/', 'groq'],
  ['deepseek-ai/', 'deepseek'], ['deepseek/', 'deepseek'], ['mistralai/', 'mistral'], ['mistral/', 'mistral'],
  ['moonshotai/', 'moonshot'], ['moonshot/', 'moonshot'],
];

/** A model listed live from the provider with the user's key: `<provider>:<provider's own id>` (lib/model-list.ts). */
export interface LiveModel { id: string; name: string }
export type LiveModels = Partial<Record<ProviderId, LiveModel[]>>;

/** The provider of a live-listed id ("groq:qwen/qwen3.8-27b"), or null for any other id. */
export function liveProvider(engineId: string): ProviderId | null {
  const m = /^([a-z]+):./.exec(String(engineId || ''));
  return m && m[1] in PROVIDER_NAME ? (m[1] as ProviderId) : null;
}

/** Which provider key runs this engine id: the catalog first, then live-listed ids, then the legacy prefixes; null means unsupported. */
export function providerOf(engineId: string): ProviderId | null {
  const id = String(engineId || '');
  const k = (Object.keys(MODELS) as ModelKey[]).find((m) => MODELS[m].engineId === id);
  if (k) return MODELS[k].provider;
  return liveProvider(id) ?? LEGACY_PROVIDER.find(([prefix]) => id.startsWith(prefix))?.[1] ?? null;
}

/** The catalog model that shares this provider, for its colour on live-listed models. */
const providerModel = (p: ProviderId): ModelKey | undefined => (Object.keys(MODELS) as ModelKey[]).find((k) => MODELS[k].provider === p);

export function modelInfo(engineId: string): { key: ModelKey | null; label: string; name: string; color: string } {
  const key = (Object.keys(MODELS) as ModelKey[]).find((k) => MODELS[k].engineId === engineId);
  if (key) return { key, label: MODELS[key].label, name: MODELS[key].name, color: MODELS[key].color };
  const live = liveProvider(engineId), id = live ? String(engineId).slice(live.length + 1) : String(engineId || '');
  const last = id.split('/').filter(Boolean).pop() ?? '';
  const pk = live ? providerModel(live) : undefined;
  return { key: null, label: last, name: last, color: pk ? MODELS[pk].color : '#6E6585' };
}

export const PERSONAS: Record<'none' | 'skeptic' | 'teacher' | 'coach' | 'analyst', { label: string; text: string }> = {
  none: { label: 'Just answer', text: '' },
  skeptic: { label: 'Skeptic', text: 'Push back. Look for what could be wrong and say how sure you are.' },
  teacher: { label: 'Teacher', text: "Explain step by step with one small example, as if I'm new to this." },
  coach: { label: 'Coach', text: 'Ask me one good question back before you answer.' },
  analyst: { label: 'Analyst', text: 'Be brief. Numbers first, then the reasoning.' },
};

export function personaLabel(key: string): string | null {
  if (key === 'none') return null;
  if (key === 'custom') return 'Custom';
  return (PERSONAS as Record<string, { label: string }>)[key]?.label ?? null;
}

export const DEFAULT_ADVANCED: AdvancedSettings = {
  temperature: null, maxOutputTokens: null, historyMode: 'auto', lastKMessages: 6, externalContextTopK: 5, contextBudgetTokens: null,
};

export function defaultChatData(name: string, model: string = MODELS[DEFAULT_MODEL_KEY].engineId): ChatData {
  return {
    name, model, persona: 'none', systemPrompt: '', inheritDesk: true, carry: 'summary',
    advanced: { ...DEFAULT_ADVANCED }, hide: [],
  };
}
