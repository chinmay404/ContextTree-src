import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { mongoService } from "@/lib/mongodb";
import { V3_KEY_PROVIDERS, type V3KeyProvider } from "@/lib/byok";
import { decryptApiKey } from "@/lib/byok-crypto";
import { checkProviderKey, type CheckResult } from "@/lib/key-check";
import rateLimit from "@/lib/rate-limit";
import { buildKeyStatuses } from "@/lib/user-api-keys-status";

export const runtime = "nodejs";

const DAY_MS = 24 * 60 * 60 * 1000;
const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500 });

const isV3 = (p: unknown): p is V3KeyProvider => (V3_KEY_PROVIDERS as readonly string[]).includes(String(p));

function isStale(checkedAt: unknown) {
  const t = typeof checkedAt === "string" ? Date.parse(checkedAt) : NaN;
  return !Number.isFinite(t) || Date.now() - t > DAY_MS;
}

/** Re-checks saved V3 keys: the stale ones (no check, or older than 24 h), or all with { force: true }. */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  const userEmail = user?.email;
  if (!userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await limiter.check(NextResponse, 10, userEmail);
  } catch {
    return NextResponse.json(
      { code: "rate_limited", error: "Too many checks. Try again in a minute." },
      { status: 429 }
    );
  }

  let force = false;
  try {
    force = (await request.json())?.force === true;
  } catch {
    // an empty body is fine
  }

  const rows = await mongoService.getUserApiKeyStatuses(userEmail);
  const due = rows.filter(
    (row: { provider?: string; metadata?: { keyCheck?: { checkedAt?: string } } | null }) =>
      isV3(row.provider) && (force || isStale(row.metadata?.keyCheck?.checkedAt))
  );

  await Promise.all(
    due.map(async (row: { provider: V3KeyProvider }) => {
      let status: CheckResult = "unchecked";
      try {
        const record = await mongoService.getUserApiKeyRecord(userEmail, row.provider);
        if (record?.encrypted_key) {
          status = await checkProviderKey(row.provider, decryptApiKey(record.encrypted_key));
        }
      } catch {
        status = "unchecked"; // a decrypt failure must not leak anything or mark the key rejected
      }
      await mongoService.setUserApiKeyCheck(userEmail, row.provider, {
        status,
        checkedAt: new Date().toISOString(),
      });
    })
  );

  const fresh = due.length ? await mongoService.getUserApiKeyStatuses(userEmail) : rows;
  return NextResponse.json(buildKeyStatuses(fresh));
}
