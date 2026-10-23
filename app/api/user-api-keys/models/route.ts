import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { mongoService } from "@/lib/mongodb";
import { V3_KEY_PROVIDERS, type V3KeyProvider } from "@/lib/byok";
import { decryptApiKey } from "@/lib/byok-crypto";
import { listProviderModels, type LiveModel } from "@/lib/model-list";

export const runtime = "nodejs";

const CACHE_MS = 10 * 60 * 1000;
/** Per user and provider, keyed on the key's hint so a replaced key lists afresh. One warm instance only; that's enough. */
const cache = new Map<string, { at: number; models: LiveModel[] }>();

const isV3 = (p: unknown): p is V3KeyProvider => (V3_KEY_PROVIDERS as readonly string[]).includes(String(p));

type Row = { provider?: string; key_hint?: string | null; metadata?: { keyCheck?: { status?: string } } | null };

/** The chat models each saved, working key can use: `{ models: { groq: [{ id: "groq:…", name }] } }`. */
export async function GET() {
  const user = await getCurrentUser();
  const email = user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows: Row[] = await mongoService.getUserApiKeyStatuses(email);
  const usable = rows.filter((r) => isV3(r.provider) && r.metadata?.keyCheck?.status !== "rejected");
  const models: Partial<Record<V3KeyProvider, LiveModel[]>> = {};

  await Promise.all(usable.map(async (row) => {
    const provider = row.provider as V3KeyProvider;
    const slot = `${email}|${provider}|${row.key_hint ?? ""}`;
    const hit = cache.get(slot);
    if (hit && Date.now() - hit.at < CACHE_MS) { models[provider] = hit.models; return; }
    try {
      const record = await mongoService.getUserApiKeyRecord(email, provider);
      if (!record?.encrypted_key) return;
      const list = await listProviderModels(provider, decryptApiKey(record.encrypted_key));
      cache.set(slot, { at: Date.now(), models: list });
      models[provider] = list;
    } catch (error) {
      // provider and reason only: never the key, never a response body
      console.info(`[model-list] ${provider}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }));

  return NextResponse.json({ models }, { headers: { "cache-control": "private, no-store" } });
}
