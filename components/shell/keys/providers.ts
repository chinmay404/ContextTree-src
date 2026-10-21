import { V3_KEY_PROVIDERS } from '@/lib/byok';
import { DEFAULT_MODEL_KEY, MAIN_MODELS, MODELS, PROVIDER_NAME, providerOf, type ModelKey } from '@/components/board/lib/catalog';
import type { KeyStatusMap, ProviderId } from './status-types';

export type { KeyState, KeyStatus, KeyStatusMap, ProviderId } from './status-types';
export { keyStatusLine } from './status-line';

export interface ProviderInfo { id: ProviderId; name: string; letter: string; color: string; models: ModelKey[]; keyUrl: string; keyHelp: string }

const SPEC: Record<ProviderId, { letter: string; color: string; keyUrl: string }> = {
  anthropic: { letter: 'A', color: '#E0673A', keyUrl: 'https://console.anthropic.com/settings/keys' },
  openai: { letter: 'O', color: '#3FAE5A', keyUrl: 'https://platform.openai.com/api-keys' },
  google: { letter: 'G', color: '#2A86C4', keyUrl: 'https://aistudio.google.com/apikey' },
  groq: { letter: 'G', color: '#D1467E', keyUrl: 'https://console.groq.com/keys' },
  deepseek: { letter: 'D', color: '#7A52D6', keyUrl: 'https://platform.deepseek.com/api_keys' },
  mistral: { letter: 'M', color: '#B8860B', keyUrl: 'https://console.mistral.ai/api-keys' },
  moonshot: { letter: 'K', color: '#2B2340', keyUrl: 'https://platform.moonshot.ai/console/api-keys' },
};

const hostAndPath = (u: string) => { const x = new URL(u); return x.host + x.pathname; };

export const PROVIDERS: ProviderInfo[] = V3_KEY_PROVIDERS.map((id) => ({
  id,
  name: PROVIDER_NAME[id],
  ...SPEC[id],
  models: (Object.keys(MODELS) as ModelKey[]).filter((k) => MODELS[k].provider === id),
  keyHelp: `Make one at ${hostAndPath(SPEC[id].keyUrl)} — it takes about a minute. We check it with ${PROVIDER_NAME[id]} before saving.`,
}));

/** Saved and not turned down by the provider ("unchecked" still counts: the check was only inconclusive). */
export function hasWorkingKey(s: KeyStatusMap | null, p: ProviderId): boolean {
  const k = s?.[p];
  return !!k && k.configured && k.status !== 'rejected';
}

/**
 * Locked means "no working key for this model's provider". An unknown model id is not locked here (the engine answers
 * unsupported_model), and nothing is locked while the statuses are still loading.
 */
export function isModelLocked(engineId: string, statuses: KeyStatusMap | null): boolean {
  const p = providerOf(engineId);
  if (!p || !statuses) return false;
  return !hasWorkingKey(statuses, p);
}

const ORDER: ModelKey[] = Array.from(new Set<ModelKey>([DEFAULT_MODEL_KEY, ...MAIN_MODELS, ...(Object.keys(MODELS) as ModelKey[])]));

/** The engine id of the first model (default first, then the main three, then the rest) whose provider has a working key. */
export function preferredModel(statuses: KeyStatusMap | null): string | null {
  const k = ORDER.find((m) => hasWorkingKey(statuses, MODELS[m].provider));
  return k ? MODELS[k].engineId : null;
}

/** What the board's model picker will show: ready rows (the preferred one marked) and locked rows with the reason. */
export function pickerPreview(statuses: KeyStatusMap | null) {
  const pref = preferredModel(statuses);
  const ready: { key: ModelKey; label: string; color: string; isDefault: boolean }[] = [];
  const locked: { key: ModelKey; label: string; color: string; reason: 'needs-key' | 'fix-key'; providerName: string }[] = [];
  for (const key of ORDER) {
    const m = MODELS[key];
    if (hasWorkingKey(statuses, m.provider)) ready.push({ key, label: m.name, color: m.color, isDefault: m.engineId === pref });
    else locked.push({
      key, label: m.name, color: m.color, providerName: PROVIDER_NAME[m.provider],
      reason: statuses?.[m.provider]?.configured ? 'fix-key' : 'needs-key',
    });
  }
  return { ready, locked };
}
