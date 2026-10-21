export const BYOK_PROVIDERS = ["openai", "anthropic", "litellm"] as const;

export type ByokProvider = (typeof BYOK_PROVIDERS)[number];

export type ProviderKeyStatus = {
  provider: ByokProvider;
  configured: boolean;
  keyHint: string | null;
  apiBaseHint?: string | null;
  updatedAt: string | null;
};

export type ProviderKeyStatusMap = Record<ByokProvider, ProviderKeyStatus>;

export const EMPTY_PROVIDER_KEY_STATUS: ProviderKeyStatusMap = {
  openai: {
    provider: "openai",
    configured: false,
    keyHint: null,
    updatedAt: null,
  },
  anthropic: {
    provider: "anthropic",
    configured: false,
    keyHint: null,
    updatedAt: null,
  },
  litellm: {
    provider: "litellm",
    configured: false,
    keyHint: null,
    apiBaseHint: null,
    updatedAt: null,
  },
};

export function cloneEmptyProviderKeyStatus(): ProviderKeyStatusMap {
  return {
    openai: { ...EMPTY_PROVIDER_KEY_STATUS.openai },
    anthropic: { ...EMPTY_PROVIDER_KEY_STATUS.anthropic },
    litellm: { ...EMPTY_PROVIDER_KEY_STATUS.litellm },
  };
}

/** V3 board providers (one per model on the board). V2's BYOK_PROVIDERS above stays as it is. */
export const V3_KEY_PROVIDERS = ["anthropic", "openai", "google", "groq", "deepseek", "mistral", "moonshot"] as const;

export type V3KeyProvider = (typeof V3_KEY_PROVIDERS)[number];

/** Every provider the key store accepts: the V3 seven plus V2's `litellm`, deduped. */
export const KEY_STORE_PROVIDERS = Array.from(
  new Set<string>([...V3_KEY_PROVIDERS, ...BYOK_PROVIDERS])
) as readonly (V3KeyProvider | ByokProvider)[];

export type KeyStoreProvider = (typeof KEY_STORE_PROVIDERS)[number];
