import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { mintBackendToken } from "@/lib/backend-jwt";
import { redactBackendUrl } from "@/lib/llm-backend";
import { resolveEngineBase } from "@/lib/engine-base";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEGMENT = /^[A-Za-z0-9_.-]+$/;
// Allow-list: nothing else from the browser (cookies, forwarded-for, origin…) reaches the engine.
const FORWARD_REQUEST_HEADERS = [
  "content-type", "accept", "accept-language", "if-none-match", "if-modified-since", "range",
];
const DROP_RESPONSE_HEADERS = new Set([
  "connection", "keep-alive", "transfer-encoding", "content-encoding", "content-length", "set-cookie",
]);
const HEADER_TIMEOUT_MS = 30_000;

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
  const where = redactBackendUrl(base);

  const target = `${base}/api/v1/${path.join("/")}${new URL(req.url).search}`;

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const v = req.headers.get(name);
    if (v !== null) headers.set(name, v);
  }
  try {
    headers.set("authorization", `Bearer ${await mintBackendToken(user.email)}`);
  } catch (e) {
    console.error("[engine proxy] token mint failed", e instanceof Error ? e.message : e);
    return json({ error: "engine_unavailable" }, 503);
  }
  headers.set("user-agent", "ContextTree/1.0");

  const isStream = path.join("/") === "chat/stream";
  const hasBody = req.method !== "GET" && req.method !== "HEAD" && req.body !== null;

  const init: RequestInit & { duplex?: "half" } = { method: req.method, headers, redirect: "manual" };
  if (hasBody) {
    init.body = req.body;
    init.duplex = "half";
  }

  // Streams follow the browser's abort only. Others also get a header timeout that is
  // cleared once headers arrive, so slow uploads/downloads are not cut mid-body.
  let timer: ReturnType<typeof setTimeout> | undefined;
  if (isStream) {
    init.signal = req.signal;
  } else {
    const ac = new AbortController();
    timer = setTimeout(() => ac.abort(), HEADER_TIMEOUT_MS);
    init.signal = AbortSignal.any([req.signal, ac.signal]);
  }

  let up: Response;
  try {
    up = await fetch(target, init);
  } catch (e) {
    console.error("[engine proxy] upstream fetch failed", where, e instanceof Error ? e.message : e);
    return json({ error: "engine_unavailable" }, 503);
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (up.status >= 300 && up.status < 400) {
    console.error("[engine proxy] upstream redirect", where, up.status);
    return json({ error: "engine_unavailable" }, 502);
  }

  const out = new Headers();
  up.headers.forEach((v, k) => {
    if (!DROP_RESPONSE_HEADERS.has(k.toLowerCase())) out.set(k, v);
  });
  if ((up.headers.get("content-type") ?? "").includes("text/event-stream")) {
    out.set("Cache-Control", "no-cache, no-transform");
    out.set("X-Accel-Buffering", "no");
  }
  return new Response(up.status === 204 || up.status === 205 ? null : up.body, {
    status: up.status,
    headers: out,
  });
}

export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
