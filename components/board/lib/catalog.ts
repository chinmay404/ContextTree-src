import type { AdvancedSettings, ChatData, SourceType } from '../api/types';

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
  media: ['#FFD9C7', '#E0673A'], docs: ['#FFF0B3', '#B8860B'], note: ['#FFE1EA', '#D1467E'], web: ['#C9ECFF', '#2A86C4'],
  data: ['#D4F2C9', '#3F9A2E'], image: ['#E6DBFF', '#7A52D6'], mixed: ['#EFE9F8', '#6E6585'], answer: ['#EFE9F8', '#6E6585'],
};
export const STRING_COL: Record<Family, string> = {
  media: '#FFB898', docs: '#F5DB6E', note: '#F7AECB', web: '#96D4F7', data: '#9EDB8C', image: '#C6B2F7', mixed: '#CFC3E8', answer: '#D6CDE6',
};

export type ModelKey = 'claude' | 'gpt' | 'gemini' | 'llama' | 'deepseek' | 'mistral' | 'kimi';

export const MODELS: Record<ModelKey, { label: string; color: string; engineId: string }> = {
  claude: { label: 'Claude', color: '#E0673A', engineId: 'anthropic/claude-sonnet-4-20250514' },
  gpt: { label: 'GPT', color: '#3FAE5A', engineId: 'openai/gpt-oss-120b' },
  gemini: { label: 'Gemini', color: '#2A86C4', engineId: 'gemini/gemini-3-flash-preview' },
  llama: { label: 'Llama (Groq)', color: '#7A52D6', engineId: 'meta-llama/llama-4-maverick-17b-128e-instruct' },
  deepseek: { label: 'DeepSeek', color: '#3B6FD8', engineId: 'deepseek-ai/deepseek-v4-pro' },
  mistral: { label: 'Mistral', color: '#E2A72A', engineId: 'mistralai/mistral-large-3-675b-instruct-2512' },
  kimi: { label: 'Kimi', color: '#D1467E', engineId: 'moonshotai/kimi-k2-instruct' },
};

export const MAIN_MODELS: ModelKey[] = ['claude', 'gpt', 'gemini'];
// Claude needs BYOK, so a Claude default would fail the first question for most users.
export const DEFAULT_MODEL_KEY: ModelKey = 'gpt';

export function modelInfo(engineId: string): { key: ModelKey | null; label: string; color: string } {
  const key = (Object.keys(MODELS) as ModelKey[]).find((k) => MODELS[k].engineId === engineId);
  if (key) return { key, label: MODELS[key].label, color: MODELS[key].color };
  const last = String(engineId || '').split('/').filter(Boolean).pop() ?? '';
  return { key: null, label: last, color: '#6E6585' };
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
