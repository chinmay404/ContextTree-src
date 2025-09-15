// LLM Models Configuration
// Centralized model definitions for consistent use across the application

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  provider: string;
  category?: string;
}

export interface ModelProvider {
  name: string;
  models: ModelConfig[];
}

// Model providers and their available models (excluding TTS and Speech-to-text)
// Organized with most popular and recommended models first
export const MODEL_PROVIDERS = {
  // Top/Popular Models - Most Recommended
  top: {
    name: "🔥 Popular & Recommended",
    models: [
      {
        id: "openai/gpt-oss-120b",
        name: "GPT OSS 120B (Recommended)",
        description: "🌟 Best for coding and complex tasks - Default choice",
        provider: "OpenAI",
      },
      {
        id: "llama-3.3-70b-versatile",
        name: "LLaMA 3.3 70B Versatile",
        description: "🚀 Most capable LLaMA model, excellent for complex tasks",
        provider: "Meta",
      },
      {
        id: "groq/compound",
        name: "Groq Compound",
        description: "⚡ Ultra-fast reasoning and complex problem solving",
        provider: "Groq",
      },
      {
        id: "llama-3.1-8b-instant",
        name: "LLaMA 3.1 8B Instant",
        description: "💨 Lightning fast responses for quick tasks",
        provider: "Meta",
      },
    ],
  },

  // OpenAI Models
  openai: {
    name: "OpenAI",
    models: [
      {
        id: "openai/gpt-oss-120b",
        name: "GPT OSS 120B",
        description: "Large open-source GPT variant - Best for coding",
        provider: "OpenAI",
      },
      {
        id: "openai/gpt-oss-20b",
        name: "GPT OSS 20B",
        description: "Smaller open-source GPT variant",
        provider: "OpenAI",
      },
    ],
  },

  // Meta LLaMA Models
  meta: {
    name: "Meta LLaMA",
    models: [
      {
        id: "llama-3.3-70b-versatile",
        name: "LLaMA 3.3 70B Versatile",
        description: "Most capable LLaMA model, best for complex tasks",
        provider: "Meta",
      },
      {
        id: "llama-3.1-8b-instant",
        name: "LLaMA 3.1 8B Instant",
        description: "Fast and efficient for most tasks",
        provider: "Meta",
      },
      {
        id: "meta-llama/llama-4-scout-17b-16e-instruct",
        name: "LLaMA 4 Scout 17B",
        description: "Latest LLaMA 4 preview model",
        provider: "Meta",
      },
      {
        id: "meta-llama/llama-4-maverick-17b-128e-instruct",
        name: "LLaMA 4 Maverick 17B",
        description: "LLaMA 4 with extended context",
        provider: "Meta",
      },
      {
        id: "meta-llama/llama-guard-4-12b",
        name: "LLaMA Guard 4 12B",
        description: "Safety and content moderation model",
        provider: "Meta",
      },
    ],
  },

  // Groq Models
  groq: {
    name: "Groq",
    models: [
      {
        id: "groq/compound",
        name: "Groq Compound",
        description: "Groq's flagship reasoning model",
        provider: "Groq",
      },
      {
        id: "groq/compound-mini",
        name: "Groq Compound Mini",
        description: "Lightweight version of Compound",
        provider: "Groq",
      },
    ],
  },

  // Google Models
  google: {
    name: "Google",
    models: [
      {
        id: "gemma2-9b-it",
        name: "Gemma 2 9B IT",
        description: "Google's efficient instruction-tuned model",
        provider: "Google",
      },
    ],
  },

  // DeepSeek Models
  deepseek: {
    name: "DeepSeek",
    models: [
      {
        id: "deepseek-r1-distill-llama-70b",
        name: "DeepSeek R1 Distill 70B",
        description: "Reasoning-focused large model",
        provider: "DeepSeek",
      },
    ],
  },

  // Alibaba Cloud Models
  alibaba: {
    name: "Alibaba Cloud",
    models: [
      {
        id: "qwen/qwen3-32b",
        name: "Qwen 3 32B",
        description: "Alibaba's multilingual model",
        provider: "Alibaba Cloud",
      },
    ],
  },

  // Moonshot AI Models
  moonshot: {
    name: "Moonshot AI",
    models: [
      {
        id: "moonshotai/kimi-k2-instruct",
        name: "Kimi K2 Instruct",
        description: "Chinese AI company's instruction model",
        provider: "Moonshot AI",
      },
      {
        id: "moonshotai/kimi-k2-instruct-0905",
        name: "Kimi K2 Instruct (Sept 2024)",
        description: "Updated version with improvements",
        provider: "Moonshot AI",
      },
    ],
  },

  // SDAIA Models
  sdaia: {
    name: "SDAIA",
    models: [
      {
        id: "allam-2-7b",
        name: "ALLaM 2 7B",
        description: "Arabic-focused language model",
        provider: "SDAIA",
      },
    ],
  },
} as const;

// Flatten all models into a single array for easy consumption
export const ALL_MODELS: ModelConfig[] = Object.values(MODEL_PROVIDERS).flatMap(
  (provider) => provider.models
);

// Model recommendations based on use case
export const MODEL_RECOMMENDATIONS = {
  general_chat: "openai/gpt-oss-120b",
  fast_responses: "llama-3.1-8b-instant",
  complex_reasoning: "groq/compound",
  coding: "openai/gpt-oss-120b",
  multilingual: "qwen/qwen3-32b",
  safety: "meta-llama/llama-guard-4-12b",
} as const;

// Get a model by ID
export function getModelById(id: string): ModelConfig | undefined {
  return ALL_MODELS.find((model) => model.id === id);
}

// Get models by provider
export function getModelsByProvider(provider: string): ModelConfig[] {
  return ALL_MODELS.filter((model) => model.provider === provider);
}

// Get the default/recommended model
export function getDefaultModel(): string {
  return MODEL_RECOMMENDATIONS.general_chat;
}
