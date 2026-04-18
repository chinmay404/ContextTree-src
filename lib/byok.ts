export const BYOK_PROVIDERS = ["openai", "anthropic"] as const;

export type ByokProvider = (typeof BYOK_PROVIDERS)[number];

export type ProviderKeyStatus = {
  provider: ByokProvider;
  configured: boolean;
  keyHint: string | null;
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
};

export function cloneEmptyProviderKeyStatus(): ProviderKeyStatusMap {
  return {
    openai: { ...EMPTY_PROVIDER_KEY_STATUS.openai },
    anthropic: { ...EMPTY_PROVIDER_KEY_STATUS.anthropic },
  };
}
