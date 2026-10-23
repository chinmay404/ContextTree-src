import "server-only";

import type { V3KeyProvider } from "@/lib/byok";

export const MODEL_LIST_TIMEOUT_MS = 6000;

/** One chat model a provider offers on the user's key. `id` is the board's engine id: `<provider>:<provider's own id>`. */
export interface LiveModel { id: string; name: string }

type Raw = Record<string, any>;

const bearer = (key: string) => ({ Authorization: `Bearer ${key}` });

const ENGINE_ID = /^[A-Za-z0-9][A-Za-z0-9._:/@-]{0,127}$/;

/** Dated snapshots ("gpt-5-2025-08-07", "mistral-large-2411") duplicate their alias; the picker keeps the alias. */
const DATED = /-(\d{4}-\d{2}-\d{2}|\d{4})$/;

/** Each provider's full list-models call and how to keep only the models a chat can use. The key only goes in a header. */
const LISTS: Record<V3KeyProvider, {
  url: string;
  headers: (key: string) => Record<string, string>;
  pick: (body: Raw) => { id: string; name?: string }[];
}> = {
  anthropic: {
    url: "https://api.anthropic.com/v1/models?limit=1000",
    headers: (key) => ({ "x-api-key": key, "anthropic-version": "2023-06-01" }),
    pick: (b) => (b.data ?? []).map((m: Raw) => ({ id: m.id, name: m.display_name })),
  },
  openai: {
    url: "https://api.openai.com/v1/models",
    headers: bearer,
    pick: (b) => (b.data ?? [])
      .map((m: Raw) => ({ id: String(m.id) }))
      .filter(({ id }: { id: string }) => /^(gpt-|o\d|chatgpt-)/.test(id)
        && !/(audio|realtime|tts|transcribe|image|search|embedding|moderation|instruct|codex|-pro\b|deep-research)/.test(id)
        && !DATED.test(id)),
  },
  google: {
    url: "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000",
    headers: (key) => ({ "x-goog-api-key": key }),
    pick: (b) => (b.models ?? [])
      .filter((m: Raw) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
      .map((m: Raw) => ({ id: String(m.name).replace(/^models\//, ""), name: m.displayName }))
      .filter(({ id }: { id: string }) => id.startsWith("gemini")
        && !/(image|tts|embedding|computer-use|live|native-audio|robotics)/.test(id)),
  },
  groq: {
    url: "https://api.groq.com/openai/v1/models",
    headers: bearer,
    pick: (b) => (b.data ?? [])
      .filter((m: Raw) => m.active !== false)
      .map((m: Raw) => ({ id: String(m.id) }))
      .filter(({ id }: { id: string }) => !/(whisper|orpheus|playai|tts|guard|safeguard)/.test(id)),
  },
  deepseek: {
    url: "https://api.deepseek.com/models",
    headers: bearer,
    pick: (b) => (b.data ?? []).map((m: Raw) => ({ id: String(m.id) })),
  },
  mistral: {
    url: "https://api.mistral.ai/v1/models",
    headers: bearer,
    pick: (b) => (b.data ?? [])
      .filter((m: Raw) => m.capabilities?.completion_chat !== false && !m.deprecation)
      .map((m: Raw) => ({ id: String(m.id) }))
      .filter(({ id }: { id: string }) => !/(embed|moderation|ocr|transcribe|voxtral)/.test(id) && !DATED.test(id)),
  },
  moonshot: {
    url: "https://api.moonshot.ai/v1/models",
    headers: bearer,
    pick: (b) => (b.data ?? []).map((m: Raw) => ({ id: String(m.id) })),
  },
};

/** The provider's own id, tidied for people when the provider gives no display name. */
export function prettyModelName(id: string): string {
  return id.split("/").pop() || id;
}

/** The user's chat models at this provider, sorted by name; throws when the provider can't be reached or refuses the key. */
export async function listProviderModels(
  provider: V3KeyProvider,
  key: string,
  deps: { fetch?: typeof fetch } = {}
): Promise<LiveModel[]> {
  const spec = LISTS[provider];
  const res = await (deps.fetch ?? fetch)(spec.url, {
    method: "GET",
    headers: spec.headers(key),
    signal: AbortSignal.timeout(MODEL_LIST_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`http ${res.status}`); // status only: never the body, which can echo the key
  const seen = new Set<string>();
  const out: LiveModel[] = [];
  for (const m of spec.pick(await res.json())) {
    // only ids the engine will route (ContextTree app/agent/helpers/v3_llm.py, _LIVE_ID)
    if (!ENGINE_ID.test(m.id) || m.id.includes("..") || seen.has(m.id)) continue;
    seen.add(m.id);
    out.push({ id: `${provider}:${m.id}`, name: m.name || prettyModelName(m.id) });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}
