import { resolveLlmApiUrl } from "@/lib/llm-backend";

/** LLM_API_URL with everything from `/chat` onward removed, no trailing slash. */
export function resolveEngineBase(): string | undefined {
  const url = resolveLlmApiUrl();
  if (!url) return undefined;
  const i = url.indexOf("/chat");
  const base = i >= 0 ? url.slice(0, i) : url;
  const stripped = base.replace(/\/+$/, "");
  // LLM_API_URL ends in /api/v1/chat; the engine path is added by the proxy.
  return stripped.replace(/\/api\/v1$/, "");
}
