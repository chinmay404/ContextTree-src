import { KEY_STORE_PROVIDERS, cloneEmptyStoreStatus, type KeyStoreProvider } from "@/lib/byok";

const VALID = new Set<string>(KEY_STORE_PROVIDERS);

export function parseStoreProvider(value: unknown): KeyStoreProvider | null {
  const provider = String(value || "").trim().toLowerCase();
  return VALID.has(provider) ? (provider as KeyStoreProvider) : null;
}

export function normalizeApiBase(value: unknown) {
  const apiBase = String(value || "").trim();
  if (!apiBase) return null;
  try {
    const url = new URL(apiBase);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function formatApiBaseHint(value: unknown) {
  const apiBase = normalizeApiBase(value);
  if (!apiBase) return null;
  try {
    const url = new URL(apiBase);
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

export function last4FromHint(hint: unknown): string | null {
  const m = /••••(.{1,4})$/.exec(String(hint || ""));
  return m ? m[1] : null;
}

type Row = { provider?: string; key_hint?: string | null; metadata?: Record<string, any> | null; updated_at?: string | Date | null };

/** The GET body. Only status fields: never the key, never the ciphertext. */
export function buildKeyStatuses(rows: Row[]) {
  const providers = cloneEmptyStoreStatus();
  for (const row of rows) {
    const provider = parseStoreProvider(row.provider);
    if (!provider) continue;
    const check = row.metadata?.keyCheck;
    providers[provider] = {
      provider,
      configured: true,
      keyHint: row.key_hint || null,
      apiBaseHint: formatApiBaseHint(row.metadata?.apiBase),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
      last4: last4FromHint(row.key_hint),
      status: check?.status === "ok" || check?.status === "rejected" || check?.status === "unchecked" ? check.status : null,
      checkedAt: typeof check?.checkedAt === "string" ? check.checkedAt : null,
    };
  }
  return { providers };
}
