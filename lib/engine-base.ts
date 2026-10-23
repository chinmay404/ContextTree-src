import { resolveLlmApiUrl } from "@/lib/llm-backend";

/**
 * LLM_API_URL reduced to the engine origin (plus any non-API path prefix):
 * `/chat…` and `/api/v1` are stripped from the pathname only; no trailing slash.
 */
export function resolveEngineBase(): string | undefined {
  const raw = resolveLlmApiUrl();
  if (!raw) return undefined;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return undefined;
  }
  let p = u.pathname;
  const i = p.indexOf("/chat");
  if (i >= 0) p = p.slice(0, i);
  p = p.replace(/\/+$/, "").replace(/\/api\/v1$/, "");
  return `${u.origin}${p}`;
}
