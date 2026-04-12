const DEFAULT_PRODUCTION_LLM_API_URL =
  "http://contexttreeapi.duckdns.org/api/v1/chat";

const getConfiguredLlmApiUrl = () =>
  process.env.LLM_API_URL || process.env.NEXT_PUBLIC_LLM_API_URL;

const getConfiguredLlmFallbackUrl = () =>
  process.env.LLM_API_FALLBACK_URL ||
  process.env.NEXT_PUBLIC_LLM_API_FALLBACK_URL;

const isEphemeralCloudflareTunnel = (url: string) =>
  url.includes(".trycloudflare.com");

export const redactBackendUrl = (url?: string | null) =>
  url ? url.replace(/\/[^/]*$/, "/***") : "Not configured";

export function resolveLlmApiUrl(): string | undefined {
  const configuredUrl = getConfiguredLlmApiUrl()?.trim();

  if (!configuredUrl) {
    if (process.env.NODE_ENV === "production") {
      return DEFAULT_PRODUCTION_LLM_API_URL;
    }
    return undefined;
  }

  if (
    process.env.NODE_ENV === "production" &&
    isEphemeralCloudflareTunnel(configuredUrl)
  ) {
    const fallbackUrl =
      getConfiguredLlmFallbackUrl()?.trim() || DEFAULT_PRODUCTION_LLM_API_URL;

    console.warn(
      "[LLM API] Ignoring ephemeral trycloudflare URL in production and using stable fallback",
      {
        configuredUrl: redactBackendUrl(configuredUrl),
        fallbackUrl: redactBackendUrl(fallbackUrl),
      }
    );

    return fallbackUrl;
  }

  return configuredUrl;
}

export function buildChatBaseUrl(url: string) {
  return url.endsWith("/") ? url : `${url}/`;
}

export function buildFilesIngestUrl(url: string) {
  let backendUrl = url;

  if (backendUrl.includes("/chat")) {
    backendUrl = backendUrl.substring(0, backendUrl.indexOf("/chat"));
  }

  return backendUrl.replace(/\/+$/, "") + "/files/ingest";
}

export function isKnownUntrustedSSL(url: string) {
  return (
    url.includes("18.213.206.235") ||
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    url.includes("duckdns.org")
  );
}
