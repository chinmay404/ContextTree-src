import { getModelById } from "@/lib/models";

export type AdvancedHistoryMode = "auto" | "lastK";

export interface AdvancedSettings {
  temperature: number | null;
  maxOutputTokens: number | null;
  historyMode: AdvancedHistoryMode;
  lastKMessages: number;
  externalContextTopK: number;
  contextBudgetTokens: number | null;
}

export const DEFAULT_ADVANCED_SETTINGS: AdvancedSettings = {
  temperature: null,
  maxOutputTokens: null,
  historyMode: "auto",
  lastKMessages: 6,
  externalContextTopK: 5,
  contextBudgetTokens: null,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const nullableInt = (value: unknown, min: number, max: number): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const next = Number(value);
  if (!Number.isFinite(next)) return null;
  return Math.round(clamp(next, min, max));
};

const nullableFloat = (value: unknown, min: number, max: number): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const next = Number(value);
  if (!Number.isFinite(next)) return null;
  return Number(clamp(next, min, max).toFixed(2));
};

export const normalizeAdvancedSettings = (
  value?: Partial<AdvancedSettings> | null
): AdvancedSettings => {
  const historyMode = value?.historyMode === "lastK" ? "lastK" : "auto";
  return {
    temperature: nullableFloat(value?.temperature, 0, 2),
    maxOutputTokens: nullableInt(value?.maxOutputTokens, 1, 32000),
    historyMode,
    lastKMessages: nullableInt(value?.lastKMessages, 0, 50) ?? 6,
    externalContextTopK: nullableInt(value?.externalContextTopK, 0, 10) ?? 5,
    contextBudgetTokens: nullableInt(value?.contextBudgetTokens, 1, 250000),
  };
};

export const estimateTokens = (text: string) =>
  Math.ceil((text || "").trim().length / 4);

export const getTemperatureCapability = (modelId?: string | null) => {
  const isLiteLlm = Boolean(modelId?.startsWith("litellm/"));
  const model = modelId ? getModelById(modelId) : undefined;
  return {
    supportsTemperature: model?.supportsTemperature ?? true,
    min: model?.temperatureMin ?? 0,
    max: model?.temperatureMax ?? 2,
    defaultValue: model?.temperatureDefault ?? 0.8,
    isBestEffort: isLiteLlm,
  };
};

export const buildAdvancedRequestPayload = (
  settings?: Partial<AdvancedSettings> | null
) => {
  const normalized = normalizeAdvancedSettings(settings);
  return {
    temperature: normalized.temperature,
    maxOutputTokens: normalized.maxOutputTokens,
    lastKMessages:
      normalized.historyMode === "lastK" ? normalized.lastKMessages : null,
    externalContextTopK: normalized.externalContextTopK,
  };
};

export const getAdvancedBadges = (settings?: Partial<AdvancedSettings> | null) => {
  const normalized = normalizeAdvancedSettings(settings);
  const badges: string[] = [];
  if (normalized.temperature !== null) badges.push(`Temp ${normalized.temperature}`);
  if (normalized.historyMode === "lastK") badges.push(`K ${normalized.lastKMessages}`);
  if (normalized.externalContextTopK !== 5) badges.push(`Ctx ${normalized.externalContextTopK}`);
  if (normalized.maxOutputTokens !== null) badges.push(`Out ${normalized.maxOutputTokens}`);
  return badges;
};
