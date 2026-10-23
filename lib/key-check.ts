import "server-only";

import type { V3KeyProvider } from "@/lib/byok";

export const KEY_CHECK_TIMEOUT_MS = 5000;

export type CheckResult = "ok" | "rejected" | "unchecked";

const bearer = (key: string) => ({ Authorization: `Bearer ${key}` });

/** Each provider's cheapest authenticated list-models call. The key only ever goes in a header. */
export const KEY_CHECKS: Record<
  V3KeyProvider,
  { url: string; headers: (key: string) => Record<string, string> }
> = {
  anthropic: {
    url: "https://api.anthropic.com/v1/models?limit=1",
    headers: (key) => ({ "x-api-key": key, "anthropic-version": "2023-06-01" }),
  },
  openai: { url: "https://api.openai.com/v1/models", headers: bearer },
  google: {
    url: "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1",
    headers: (key) => ({ "x-goog-api-key": key }),
  },
  groq: { url: "https://api.groq.com/openai/v1/models", headers: bearer },
  deepseek: { url: "https://api.deepseek.com/models", headers: bearer },
  mistral: { url: "https://api.mistral.ai/v1/models", headers: bearer },
  moonshot: { url: "https://api.moonshot.ai/v1/models", headers: bearer },
};

function log(provider: string, outcome: CheckResult, why?: string) {
  // provider and outcome only: never the key, never a response body
  console.info(`[key-check] ${provider}: ${outcome}${why ? ` (${why})` : ""}`);
}

export async function checkProviderKey(
  provider: V3KeyProvider,
  key: string,
  deps: { fetch?: typeof fetch } = {}
): Promise<CheckResult> {
  // V2's /api/llm/test turns TLS verification off process-wide in non-prod. A check made then proves nothing.
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
    log(provider, "unchecked", "tls verification off");
    return "unchecked";
  }

  const spec = KEY_CHECKS[provider];
  const doFetch = deps.fetch ?? fetch;
  let result: CheckResult = "unchecked";
  let why: string | undefined;

  try {
    const res = await doFetch(spec.url, {
      method: "GET",
      headers: spec.headers(key),
      signal: AbortSignal.timeout(KEY_CHECK_TIMEOUT_MS),
      cache: "no-store",
    });
    if (res.status >= 200 && res.status < 300) {
      result = "ok";
    } else if (res.status === 401 || res.status === 403) {
      result = "rejected";
    } else if (provider === "google" && res.status === 400) {
      const text = await res.text().catch(() => "");
      if (text.includes("API_KEY_INVALID")) result = "rejected";
      else why = "http 400";
    } else {
      why = `http ${res.status}`;
    }
  } catch (error) {
    why = error instanceof Error && error.name === "TimeoutError" ? "timeout" : "network";
  }

  log(provider, result, why);
  return result;
}
