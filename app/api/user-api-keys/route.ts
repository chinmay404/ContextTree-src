import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { mongoService } from "@/lib/mongodb";
import { V3_KEY_PROVIDERS, PROVIDER_LABEL, type V3KeyProvider } from "@/lib/byok";
import { encryptApiKey, formatKeyHint } from "@/lib/byok-crypto";
import { checkProviderKey } from "@/lib/key-check";
import {
  buildKeyStatuses,
  formatApiBaseHint,
  last4FromHint,
  normalizeApiBase,
  parseStoreProvider as parseProvider,
} from "@/lib/user-api-keys-status";

export const runtime = "nodejs";

const isV3 = (p: string): p is V3KeyProvider => (V3_KEY_PROVIDERS as readonly string[]).includes(p);

async function getAuthenticatedUserEmail() {
  const user = await getCurrentUser();
  return user?.email || null;
}

export async function GET() {
  const userEmail = await getAuthenticatedUserEmail();
  if (!userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await mongoService.getUserApiKeyStatuses(userEmail);
  return NextResponse.json(buildKeyStatuses(rows));
}

export async function POST(request: NextRequest) {
  const userEmail = await getAuthenticatedUserEmail();
  if (!userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { provider?: string; apiKey?: string; apiBase?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const provider = parseProvider(body.provider);
  const apiKey = String(body.apiKey || "").trim();
  const apiBase = normalizeApiBase(body.apiBase);

  if (!provider) {
    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  }

  if (apiKey.length < 12 && !(provider === "litellm" && apiBase)) {
    return NextResponse.json(
      { error: "API key looks incomplete. Please paste the full key." },
      { status: 400 }
    );
  }

  let encryptedKey: string | null = null;
  try {
    encryptedKey = apiKey ? encryptApiKey(apiKey) : null;
  } catch (error) {
    console.error("BYOK encryption is not configured:", error);
    return NextResponse.json(
      { error: "Secure API key storage is not configured yet. Please try again after setup." },
      { status: 500 }
    );
  }

  let metadata: Record<string, unknown> = provider === "litellm" ? { apiBase } : {};
  let keyCheck: { status: "ok" | "unchecked"; checkedAt: string } | null = null;
  if (isV3(provider)) {
    const status = await checkProviderKey(provider, apiKey);
    if (status === "rejected") {
      return NextResponse.json(
        {
          code: "key_rejected",
          error: `${PROVIDER_LABEL[provider]} turned this key down. Check that you copied all of it.`,
        },
        { status: 422 }
      );
    }
    keyCheck = { status, checkedAt: new Date().toISOString() };
    metadata = { keyCheck };
  }
  const keyHint =
    provider === "litellm" && !apiKey
      ? "LiteLLM private endpoint"
      : formatKeyHint(provider, apiKey);
  const saved = await mongoService.upsertUserApiKey(
    userEmail,
    provider,
    encryptedKey,
    keyHint,
    metadata
  );

  if (!saved) {
    return NextResponse.json(
      { error: "Unable to save API key right now." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    provider,
    configured: true,
    keyHint: saved.key_hint || keyHint,
    apiBaseHint: formatApiBaseHint(saved.metadata?.apiBase),
    updatedAt: saved.updated_at ? new Date(saved.updated_at).toISOString() : null,
    ...(keyCheck
      ? { last4: last4FromHint(saved.key_hint || keyHint), status: keyCheck.status, checkedAt: keyCheck.checkedAt }
      : {}),
  });
}

export async function DELETE(request: NextRequest) {
  const userEmail = await getAuthenticatedUserEmail();
  if (!userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { provider?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const provider = parseProvider(body.provider);
  if (!provider) {
    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  }

  const deleted = await mongoService.deleteUserApiKey(userEmail, provider);
  if (!deleted) {
    return NextResponse.json(
      { error: "Unable to remove API key right now." },
      { status: 500 }
    );
  }

  return NextResponse.json({ provider, configured: false });
}
