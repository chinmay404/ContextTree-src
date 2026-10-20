import { NextResponse } from "next/server";
import https from "https";
import { getCurrentUser } from "@/lib/auth-utils";
import { mintBackendToken } from "@/lib/backend-jwt";
import { isKnownUntrustedSSL } from "@/lib/llm-backend";
import { resolveEngineBase } from "@/lib/engine-base";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEGMENT = /^[A-Za-z0-9_.-]+$/;
const DROP_REQUEST_HEADERS = new Set([
  "cookie", "authorization", "host", "connection", "content-length",
  "keep-alive", "transfer-encoding", "upgrade", "te", "trailer", "proxy-authorization",
]);
const DROP_RESPONSE_HEADERS = new Set([
  "connection", "keep-alive", "transfer-encoding", "content-encoding", "content-length", "set-cookie",
]);
const JSON_TIMEOUT_MS = 30_000;

const json = (body: unknown, status: number) => NextResponse.json(body, { status });

type Ctx = { params: Promise<{ path: string[] }> | { path: string[] } };

async function handler(req: Request, ctx: Ctx): Promise<Response> {
  const user = await getCurrentUser();
  if (!user?.email) return json({ error: "unauthorized" }, 401);

  const { path } = await ctx.params;
  if (!path?.length || path.some((s) => !SEGMENT.test(s) || s === ".." || s === ".")) {
    return json({ error: "invalid" }, 400);
  }

  const base = resolveEngineBase();
  if (!base) return json({ error: "engine_unavailable" }, 503);

  const search = new URL(req.url).search;
  const target = `${base}/api/v1/${path.join("/")}${search}`;

  const headers = new Headers();
  req.headers.forEach((v, k) => {
    if (!DROP_REQUEST_HEADERS.has(k.toLowerCase())) headers.set(k, v);
  });

  try {
    headers.set("authorization", `Bearer ${await mintBackendToken(user.email)}`);
    headers.set("user-agent", "ContextTree/1.0");

    const isStream =
      path.join("/") === "chat/stream" || (req.headers.get("accept") ?? "").includes("text/event-stream");
    const hasBody = req.method !== "GET" && req.method !== "HEAD" && req.body !== null;

    const init: RequestInit & { duplex?: "half"; agent?: unknown } = {
      method: req.method,
      headers,
      redirect: "manual",
    };
    if (hasBody) {
      init.body = req.body;
      init.duplex = "half";
    }
    if (!isStream) init.signal = AbortSignal.timeout(JSON_TIMEOUT_MS);
    else init.signal = req.signal;
    if (isKnownUntrustedSSL(base) && base.startsWith("https://")) {
      init.agent = new https.Agent({ rejectUnauthorized: false });
    }

    const up = await fetch(target, init);

    const out = new Headers();
    up.headers.forEach((v, k) => {
      if (!DROP_RESPONSE_HEADERS.has(k.toLowerCase())) out.set(k, v);
    });
    if ((up.headers.get("content-type") ?? "").includes("text/event-stream")) {
      out.set("Cache-Control", "no-cache, no-transform");
      out.set("X-Accel-Buffering", "no");
    }
    return new Response(up.status === 204 || up.status === 304 ? null : up.body, {
      status: up.status,
      headers: out,
    });
  } catch {
    return json({ error: "engine_unavailable" }, 503);
  }
}

export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
