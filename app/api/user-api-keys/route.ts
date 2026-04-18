import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { mongoService } from "@/lib/mongodb";
import {
  BYOK_PROVIDERS,
  cloneEmptyProviderKeyStatus,
  type ByokProvider,
} from "@/lib/byok";
import { encryptApiKey, formatKeyHint } from "@/lib/byok-crypto";

export const runtime = "nodejs";

const VALID_PROVIDERS = new Set<ByokProvider>(BYOK_PROVIDERS);

function parseProvider(value: unknown): ByokProvider | null {
  const provider = String(value || "").trim().toLowerCase() as ByokProvider;
  return VALID_PROVIDERS.has(provider) ? provider : null;
}

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
  const providers = cloneEmptyProviderKeyStatus();

  for (const row of rows) {
    const provider = parseProvider(row.provider);
    if (!provider) continue;
    providers[provider] = {
      provider,
      configured: true,
      keyHint: row.key_hint || null,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    };
  }

  return NextResponse.json({ providers });
}

export async function POST(request: NextRequest) {
  const userEmail = await getAuthenticatedUserEmail();
  if (!userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { provider?: string; apiKey?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const provider = parseProvider(body.provider);
  const apiKey = String(body.apiKey || "").trim();

  if (!provider) {
    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  }

  if (apiKey.length < 12) {
    return NextResponse.json(
      { error: "API key looks incomplete. Please paste the full key." },
      { status: 400 }
    );
  }

  let encryptedKey: string;
  try {
    encryptedKey = encryptApiKey(apiKey);
  } catch (error) {
    console.error("BYOK encryption is not configured:", error);
    return NextResponse.json(
      { error: "Secure API key storage is not configured yet. Please try again after setup." },
      { status: 500 }
    );
  }
  const keyHint = formatKeyHint(provider, apiKey);
  const saved = await mongoService.upsertUserApiKey(
    userEmail,
    provider,
    encryptedKey,
    keyHint
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
    updatedAt: saved.updated_at ? new Date(saved.updated_at).toISOString() : null,
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
