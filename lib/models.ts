// Centralized model catalog and picker groupings.
// Keep legacy entries here as well so existing canvases still resolve names/icons.

export type ModelAvailability = "enabled" | "disabled";

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  provider: string;
  category?: string;
  availability?: ModelAvailability;
  badge?: string;
  disabledReason?: string;
}

export interface ModelSelectionSection {
  id: string;
  name: string;
  provider: string;
  description: string;
  defaultOpen?: boolean;
  models: ModelConfig[];
}

const LIVE_MODELS: ModelConfig[] = [
  {
    id: "openai/gpt-oss-120b",
    name: "GPT OSS 120B",
    description: "Open-weight GPT model currently routed through Groq. Strong coding and long-form work.",
    provider: "OpenAI",
    availability: "enabled",
    badge: "Live",
  },
  {
    id: "openai/gpt-oss-20b",
    name: "GPT OSS 20B",
    description: "Lighter GPT OSS option for faster replies while keeping the same family.",
    provider: "OpenAI",
    availability: "enabled",
    badge: "Live",
  },
  {
    id: "groq/compound",
    name: "Groq Compound",
    description: "Fast reasoning model on Groq with a clean latency/quality balance.",
    provider: "Groq",
    availability: "enabled",
    badge: "Free",
  },
  {
    id: "groq/compound-mini",
    name: "Groq Compound Mini",
    description: "Lowest-latency Groq option for quick branches and lighter chats.",
    provider: "Groq",
    availability: "enabled",
    badge: "Free",
  },
  {
    id: "gemini/gemini-3-flash-preview",
    name: "Gemini 3 Flash",
    description: "Google’s fast Gemini lane for general chat and multimodal-friendly workflows.",
    provider: "Google",
    category: "gemini",
    availability: "enabled",
    badge: "Live",
  },
  {
    id: "moonshotai/kimi-k2-instruct",
    name: "Kimi K2",
    description: "Moonshot’s large reasoning model exposed through NVIDIA’s free endpoint.",
    provider: "Moonshot AI",
    availability: "enabled",
    badge: "Free",
  },
  {
    id: "moonshotai/kimi-k2-instruct-0905",
    name: "Kimi K2 0905",
    description: "The stronger Kimi K2 follow-on with longer context and better coding depth.",
    provider: "Moonshot AI",
    availability: "enabled",
    badge: "Free",
  },
  {
    id: "z-ai/glm-4.7",
    name: "GLM 4.7",
    description: "Z.ai’s latest GLM model via NVIDIA’s free catalog.",
    provider: "Z AI",
    availability: "enabled",
    badge: "Free",
  },
  {
    id: "deepseek-ai/deepseek-v3.1",
    name: "DeepSeek V3.1",
    description: "Large general-purpose DeepSeek model routed through NVIDIA.",
    provider: "DeepSeek",
    availability: "enabled",
    badge: "Free",
  },
  {
    id: "deepseek-ai/deepseek-v3.2",
    name: "DeepSeek V3.2",
    description: "Updated DeepSeek release with stronger reasoning on NVIDIA’s free endpoint.",
    provider: "DeepSeek",
    availability: "enabled",
    badge: "Free",
  },
  {
    id: "mistralai/mistral-large-3-675b-instruct-2512",
    name: "Mistral Large 3",
    description: "Large Mistral instruct model from NVIDIA’s free catalog.",
    provider: "Mistral",
    availability: "enabled",
    badge: "Free",
  },
];

const LOCKED_MODELS: ModelConfig[] = [
  {
    id: "openai/gpt-5.4",
    name: "ChatGPT 5.4",
    description: "Official ChatGPT-grade model. Kept visible here, but still disabled for now.",
    provider: "OpenAI",
    availability: "disabled",
    badge: "Locked",
    disabledReason: "OpenAI direct provider is not enabled yet.",
  },
  {
    id: "openai/gpt-5.4-mini",
    name: "ChatGPT 5.4 Mini",
    description: "Smaller ChatGPT option for faster production usage once OpenAI is turned on.",
    provider: "OpenAI",
    availability: "disabled",
    badge: "Locked",
    disabledReason: "OpenAI direct provider is not enabled yet.",
  },
  {
    id: "anthropic/claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    description: "Balanced Claude model for high-quality chat and writing. Visible, but disabled.",
    provider: "Anthropic",
    availability: "disabled",
    badge: "Locked",
    disabledReason: "Anthropic provider is not enabled yet.",
  },
  {
    id: "anthropic/claude-opus-4-1",
    name: "Claude Opus 4.1",
    description: "Highest-end Claude tier for deeper reasoning when Anthropic is turned on.",
    provider: "Anthropic",
    availability: "disabled",
    badge: "Locked",
    disabledReason: "Anthropic provider is not enabled yet.",
  },
  {
    id: "gemini/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "Shown for future upgrade paths, but the current live Google lane is Gemini 3 Flash.",
    provider: "Google",
    category: "gemini",
    availability: "disabled",
    badge: "Locked",
    disabledReason: "Only Gemini 3 Flash is enabled right now.",
  },
  {
    id: "gemini/gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    description: "Legacy long-context Gemini option kept visible but intentionally disabled.",
    provider: "Google",
    category: "gemini",
    availability: "disabled",
    badge: "Locked",
    disabledReason: "Only Gemini 3 Flash is enabled right now.",
  },
  {
    id: "gemini/gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    description: "Older Gemini flash tier, visible for roadmap clarity but not selectable.",
    provider: "Google",
    category: "gemini",
    availability: "disabled",
    badge: "Locked",
    disabledReason: "Only Gemini 3 Flash is enabled right now.",
  },
];

const LEGACY_MODELS: ModelConfig[] = [
  {
    id: "llama-3.3-70b-versatile",
    name: "LLaMA 3.3 70B Versatile",
    description: "Legacy Groq/Meta model kept for old canvases and node badges.",
    provider: "Meta",
  },
  {
    id: "llama-3.1-8b-instant",
    name: "LLaMA 3.1 8B Instant",
    description: "Legacy Groq/Meta fast model kept for compatibility.",
    provider: "Meta",
  },
  {
    id: "meta-llama/llama-4-scout-17b-16e-instruct",
    name: "LLaMA 4 Scout 17B",
    description: "Legacy Meta model kept for compatibility with existing nodes.",
    provider: "Meta",
  },
  {
    id: "meta-llama/llama-4-maverick-17b-128e-instruct",
    name: "LLaMA 4 Maverick 17B",
    description: "Legacy Meta model kept for compatibility with existing nodes.",
    provider: "Meta",
  },
  {
    id: "meta-llama/llama-guard-4-12b",
    name: "LLaMA Guard 4 12B",
    description: "Legacy safety model kept for compatibility.",
    provider: "Meta",
  },
  {
    id: "gemini/gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    description: "Legacy Gemini model kept for existing nodes and history.",
    provider: "Google",
    category: "gemini",
  },
  {
    id: "gemma2-9b-it",
    name: "Gemma 2 9B (via Groq)",
    description: "Legacy Google open model kept for compatibility.",
    provider: "Google",
  },
  {
    id: "deepseek-r1-distill-llama-70b",
    name: "DeepSeek R1 Distill 70B",
    description: "Legacy DeepSeek model kept for older branches.",
    provider: "DeepSeek",
  },
  {
    id: "qwen/qwen3-32b",
    name: "Qwen 3 32B",
    description: "Legacy Alibaba/Qwen model kept for compatibility.",
    provider: "Alibaba Cloud",
  },
  {
    id: "allam-2-7b",
    name: "ALLaM 2 7B",
    description: "Legacy SDAIA model kept for compatibility.",
    provider: "SDAIA",
  },
];

const MODEL_CATALOG = [...LIVE_MODELS, ...LOCKED_MODELS, ...LEGACY_MODELS];

const MODEL_INDEX = new Map(MODEL_CATALOG.map((model) => [model.id, model]));

const resolveModels = (ids: string[]): ModelConfig[] =>
  ids
    .map((id) => MODEL_INDEX.get(id))
    .filter((model): model is ModelConfig => Boolean(model));

const RECOMMENDED_MODEL_IDS = [
  "openai/gpt-oss-120b",
  "gemini/gemini-3-flash-preview",
  "moonshotai/kimi-k2-instruct-0905",
  "deepseek-ai/deepseek-v3.2",
];

export const MODEL_SELECTION_SECTIONS: ModelSelectionSection[] = [
  {
    id: "google",
    name: "Google",
    provider: "Google",
    description: "Gemini 3 Flash is live. The rest stay visible as locked roadmap options.",
    defaultOpen: true,
    models: resolveModels([
      "gemini/gemini-3-flash-preview",
      "gemini/gemini-2.5-pro",
      "gemini/gemini-1.5-pro",
      "gemini/gemini-1.5-flash",
    ]),
  },
  {
    id: "anthropic",
    name: "Anthropic",
    provider: "Anthropic",
    description: "Claude is shown in the catalog, but still intentionally disabled.",
    defaultOpen: false,
    models: resolveModels([
      "anthropic/claude-sonnet-4-5",
      "anthropic/claude-opus-4-1",
    ]),
  },
  {
    id: "openai",
    name: "GPT / OpenAI",
    provider: "OpenAI",
    description: "ChatGPT entries stay visible but locked until the direct provider is enabled.",
    defaultOpen: false,
    models: resolveModels([
      "openai/gpt-5.4",
      "openai/gpt-5.4-mini",
    ]),
  },
  {
    id: "groq",
    name: "Groq",
    provider: "Groq",
    description: "These are the live low-cost / free models we currently allow in production.",
    defaultOpen: true,
    models: resolveModels([
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "groq/compound",
      "groq/compound-mini",
    ]),
  },
  {
    id: "nvidia",
    name: "NVIDIA",
    provider: "NVIDIA",
    description: "Free NVIDIA NIM catalog picks exposed as live choices in the selector.",
    defaultOpen: true,
    models: resolveModels([
      "moonshotai/kimi-k2-instruct",
      "moonshotai/kimi-k2-instruct-0905",
      "z-ai/glm-4.7",
      "deepseek-ai/deepseek-v3.1",
      "deepseek-ai/deepseek-v3.2",
      "mistralai/mistral-large-3-675b-instruct-2512",
    ]),
  },
];

export const RECOMMENDED_MODELS: ModelConfig[] = resolveModels(RECOMMENDED_MODEL_IDS);

export const ALL_MODELS: ModelConfig[] = Array.from(MODEL_INDEX.values());

export const ENABLED_MODELS: ModelConfig[] = ALL_MODELS.filter(
  (model) => model.availability !== "disabled"
);

export const MODEL_RECOMMENDATIONS = {
  general_chat: "openai/gpt-oss-120b",
  fast_responses: "gemini/gemini-3-flash-preview",
  complex_reasoning: "deepseek-ai/deepseek-v3.2",
  coding: "moonshotai/kimi-k2-instruct-0905",
  multilingual: "z-ai/glm-4.7",
  safety: "meta-llama/llama-guard-4-12b",
} as const;

export function getModelById(id: string): ModelConfig | undefined {
  return MODEL_INDEX.get(id);
}

export function getModelsByProvider(provider: string): ModelConfig[] {
  return ALL_MODELS.filter((model) => model.provider === provider);
}

export function isModelEnabled(id: string): boolean {
  const model = getModelById(id);
  return Boolean(model && model.availability !== "disabled");
}

export function getDefaultModel(): string {
  const preferred = MODEL_RECOMMENDATIONS.general_chat;
  return isModelEnabled(preferred) ? preferred : ENABLED_MODELS[0]?.id || preferred;
}
