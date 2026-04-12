"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { getLobeIconCDN } from "@lobehub/icons/es/features/getLobeIconCDN";
import { getModelById } from "@/lib/models";
import { cn } from "@/lib/utils";

type ModelProviderKey =
  | "openai"
  | "meta"
  | "groq"
  | "anthropic"
  | "google"
  | "deepseek"
  | "alibaba"
  | "moonshot"
  | "mistral"
  | "sdaia"
  | "unknown";

type ModelProviderIconProps = Omit<ComponentProps<"span">, "children"> & {
  modelId?: string | null;
  modelName?: string | null;
  provider?: string | null;
  size?: number;
};

type ModelBadgeProps = Omit<ComponentProps<"span">, "children"> & {
  modelId?: string | null;
  modelName?: string | null;
  provider?: string | null;
  size?: "sm" | "md";
  isIconOnly?: boolean;
};

type ResolvedModelPresentation = {
  label: string;
  providerName: string;
  providerKey: ModelProviderKey;
};

const PROVIDER_THEME: Record<
  ModelProviderKey,
  {
    badge: string;
    icon: string;
  }
> = {
  openai: {
    badge: "border-emerald-100 bg-emerald-50 text-emerald-800",
    icon: "border-emerald-200/80 bg-white/90",
  },
  meta: {
    badge: "border-blue-100 bg-blue-50 text-blue-800",
    icon: "border-blue-200/80 bg-white/90",
  },
  groq: {
    badge: "border-fuchsia-100 bg-fuchsia-50 text-fuchsia-800",
    icon: "border-fuchsia-200/80 bg-white/90",
  },
  anthropic: {
    badge: "border-stone-200 bg-stone-50 text-stone-800",
    icon: "border-stone-200/80 bg-white/90",
  },
  google: {
    badge: "border-amber-100 bg-amber-50 text-amber-800",
    icon: "border-amber-200/80 bg-white/90",
  },
  deepseek: {
    badge: "border-cyan-100 bg-cyan-50 text-cyan-800",
    icon: "border-cyan-200/80 bg-white/90",
  },
  alibaba: {
    badge: "border-orange-100 bg-orange-50 text-orange-800",
    icon: "border-orange-200/80 bg-white/90",
  },
  moonshot: {
    badge: "border-violet-100 bg-violet-50 text-violet-800",
    icon: "border-violet-200/80 bg-white/90",
  },
  mistral: {
    badge: "border-rose-100 bg-rose-50 text-rose-800",
    icon: "border-rose-200/80 bg-white/90",
  },
  sdaia: {
    badge: "border-teal-100 bg-teal-50 text-teal-800",
    icon: "border-teal-200/80 bg-white/90",
  },
  unknown: {
    badge: "border-slate-200 bg-slate-50 text-slate-700",
    icon: "border-slate-200 bg-white/90",
  },
};

const PROVIDER_DISPLAY_NAME: Record<ModelProviderKey, string> = {
  openai: "OpenAI",
  meta: "Meta",
  groq: "Groq",
  anthropic: "Anthropic",
  google: "Google",
  deepseek: "DeepSeek",
  alibaba: "Alibaba Cloud",
  moonshot: "Moonshot AI",
  mistral: "Mistral",
  sdaia: "SDAIA",
  unknown: "Model",
};

type LobeIconAsset = {
  id: string;
  type: "mono" | "color";
};

const normalizeProviderKey = (value?: string | null): ModelProviderKey => {
  const normalized = (value || "").toLowerCase();

  if (
    normalized.includes("openai") ||
    normalized.includes("gpt-oss") ||
    normalized.startsWith("gpt")
  ) {
    return "openai";
  }

  if (normalized.includes("meta") || normalized.includes("llama")) {
    return "meta";
  }

  if (normalized.includes("groq") || normalized.includes("compound")) {
    return "groq";
  }

  if (normalized.includes("anthropic") || normalized.includes("claude")) {
    return "anthropic";
  }

  if (
    normalized.includes("google") ||
    normalized.includes("gemini") ||
    normalized.includes("gemma")
  ) {
    return "google";
  }

  if (normalized.includes("deepseek")) {
    return "deepseek";
  }

  if (normalized.includes("alibaba") || normalized.includes("qwen")) {
    return "alibaba";
  }

  if (normalized.includes("moonshot") || normalized.includes("kimi")) {
    return "moonshot";
  }

  if (
    normalized.includes("mistral") ||
    normalized.includes("mixtral") ||
    normalized.includes("codestral")
  ) {
    return "mistral";
  }

  if (normalized.includes("sdaia") || normalized.includes("allam")) {
    return "sdaia";
  }

  return "unknown";
};

const formatFallbackModelName = (value?: string | null) => {
  if (!value) return "Model";
  const segment = value.split("/").pop() || value;
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const resolveModelPresentation = ({
  modelId,
  modelName,
  provider,
}: {
  modelId?: string | null;
  modelName?: string | null;
  provider?: string | null;
}): ResolvedModelPresentation => {
  const model = modelId ? getModelById(modelId) : undefined;
  const providerKey = normalizeProviderKey(
    provider || model?.provider || modelId || modelName
  );

  return {
    label: modelName || model?.name || formatFallbackModelName(modelId),
    providerName:
      provider || model?.provider || PROVIDER_DISPLAY_NAME[providerKey],
    providerKey,
  };
};

const shouldUseModelIcon = (value?: string | null) =>
  /gpt|gemini|gemma|llama|deepseek|qwen|qwq|qvq|kimi|moonshot|claude|anthropic|mistral|mixtral|codestral/i.test(
    value || ""
  );

const resolveLobeIconAsset = ({
  modelId,
  modelName,
  providerKey,
}: {
  modelId?: string | null;
  modelName?: string | null;
  providerKey: ModelProviderKey;
}): LobeIconAsset | null => {
  const value = `${modelId || ""} ${modelName || ""}`.toLowerCase();

  if (value.includes("claude")) return { id: "claude", type: "color" };
  if (value.includes("anthropic")) return { id: "anthropic", type: "mono" };
  if (value.includes("gpt")) return { id: "openai", type: "mono" };
  if (value.includes("gemini")) return { id: "gemini", type: "color" };
  if (value.includes("gemma")) return { id: "gemma", type: "color" };
  if (value.includes("llama")) return { id: "meta", type: "color" };
  if (value.includes("deepseek")) return { id: "deepseek", type: "color" };
  if (/qwen|qwq|qvq/.test(value)) return { id: "qwen", type: "color" };
  if (value.includes("kimi")) return { id: "kimi", type: "color" };
  if (value.includes("moonshot")) return { id: "moonshot", type: "mono" };
  if (/mistral|mixtral|codestral/.test(value)) {
    return { id: "mistral", type: "color" };
  }
  if (value.includes("groq") || value.includes("compound")) {
    return { id: "groq", type: "mono" };
  }

  switch (providerKey) {
    case "openai":
      return { id: "openai", type: "mono" };
    case "meta":
      return { id: "meta", type: "color" };
    case "groq":
      return { id: "groq", type: "mono" };
    case "anthropic":
      return { id: "anthropic", type: "mono" };
    case "google":
      return { id: "google", type: "color" };
    case "deepseek":
      return { id: "deepseek", type: "color" };
    case "alibaba":
      return { id: "alibabacloud", type: "color" };
    case "moonshot":
      return { id: "moonshot", type: "mono" };
    case "mistral":
      return { id: "mistral", type: "color" };
    default:
      return null;
  }
};

const getFallbackMonogram = ({
  label,
  providerKey,
}: {
  label: string;
  providerKey: ModelProviderKey;
}) => {
  if (providerKey === "sdaia" || /allam/i.test(label)) {
    return "AL";
  }

  const tokens = label.match(/[A-Za-z0-9]+/g) || [];
  const letters = tokens
    .filter((token) => /[A-Za-z]/.test(token))
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase())
    .join("");

  return letters || "AI";
};

export const ModelProviderIcon = ({
  className,
  modelId,
  modelName,
  provider,
  size = 18,
  ...props
}: ModelProviderIconProps) => {
  const presentation = resolveModelPresentation({ modelId, modelName, provider });
  const theme = PROVIDER_THEME[presentation.providerKey];
  const iconSize = Math.max(12, Math.round(size * 0.74));
  const iconInput = modelId || modelName || presentation.label;
  const iconAsset =
    !/allam/i.test(iconInput || "") &&
    (shouldUseModelIcon(iconInput)
      ? resolveLobeIconAsset({
          modelId,
          modelName,
          providerKey: presentation.providerKey,
        })
      : resolveLobeIconAsset({
          modelId: provider,
          modelName: presentation.providerName,
          providerKey: presentation.providerKey,
        }));
  const iconSrc = iconAsset
    ? getLobeIconCDN(iconAsset.id, {
        format: "svg",
        type: iconAsset.type,
      })
    : null;
  const [hasAssetError, setHasAssetError] = useState(false);

  useEffect(() => {
    setHasAssetError(false);
  }, [iconSrc]);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[10px] border shadow-sm",
        theme.icon,
        className
      )}
      data-slot="model-provider-icon"
      style={{ width: size, height: size }}
      title={`${presentation.providerName} · ${presentation.label}`}
      {...props}
    >
      {iconSrc && !hasAssetError ? (
        <img
          src={iconSrc}
          alt={`${presentation.providerName} icon`}
          className="object-contain"
          width={iconSize}
          height={iconSize}
          loading="lazy"
          decoding="async"
          onError={() => setHasAssetError(true)}
        />
      ) : (
        <span className="text-[7px] font-black uppercase tracking-[0.14em] text-slate-600">
          {getFallbackMonogram({
            label: presentation.label,
            providerKey: presentation.providerKey,
          })}
        </span>
      )}
    </span>
  );
};

export const ModelBadge = ({
  className,
  modelId,
  modelName,
  provider,
  size = "md",
  isIconOnly = false,
  ...props
}: ModelBadgeProps) => {
  const presentation = resolveModelPresentation({ modelId, modelName, provider });
  const theme = PROVIDER_THEME[presentation.providerKey];

  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-2 rounded-full border font-medium shadow-sm",
        theme.badge,
        size === "sm" ? "px-2 py-1 text-[10px]" : "px-2.5 py-1 text-xs",
        className
      )}
      data-slot="model-badge"
      title={`${presentation.providerName} · ${presentation.label}`}
      {...props}
    >
      <ModelProviderIcon
        modelId={modelId}
        modelName={modelName}
        provider={provider}
        size={size === "sm" ? 14 : 16}
      />
      {!isIconOnly && <span className="truncate">{presentation.label}</span>}
    </span>
  );
};
