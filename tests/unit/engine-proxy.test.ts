import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/auth-utils", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/backend-jwt", () => ({ mintBackendToken: vi.fn() }));

import { getCurrentUser } from "@/lib/auth-utils";
import { mintBackendToken } from "@/lib/backend-jwt";
import { resolveEngineBase } from "@/lib/engine-base";
import { GET, POST } from "@/app/api/engine/[...path]/route";

const getUser = getCurrentUser as unknown as ReturnType<typeof vi.fn>;
const mint = mintBackendToken as unknown as ReturnType<typeof vi.fn>;
const ctx = (...path: string[]) => ({ params: Promise.resolve({ path }) });
const fetchMock = vi.fn();

beforeEach(() => {
  process.env.LLM_API_URL = "https://x.app/api/v1/chat";
  getUser.mockResolvedValue({ email: "a@b.c" });
  mint.mockResolvedValue("tok");
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } })
  );
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("resolveEngineBase", () => {
  it("strips /api/v1/chat", () => {
    process.env.LLM_API_URL = "https://x.app/api/v1/chat";
    expect(resolveEngineBase()).toBe("https://x.app");
  });
  it("handles trailing slash", () => {
    process.env.LLM_API_URL = "http://localhost:8000/api/v1/chat/";
    expect(resolveEngineBase()).toBe("http://localhost:8000");
  });
});

describe("engine proxy", () => {
  it("401 without session, no fetch", async () => {
    getUser.mockResolvedValue(undefined);
    const res = await GET(new Request("http://t/api/engine/boards"), ctx("boards"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards GET with query and bearer token", async () => {
    const res = await GET(new Request("http://t/api/engine/boards?x=1"), ctx("boards"));
    expect(res.status).toBe(200);
    expect(mint).toHaveBeenCalledWith("a@b.c");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://x.app/api/v1/boards?x=1");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer tok");
  });

  it("forwards body as a stream with content-type and duplex half", async () => {
    const ct = "multipart/form-data; boundary=XYZ";
    const req = new Request("http://t/api/engine/boards/b1/sources/file", {
      method: "POST",
      headers: { "content-type": ct },
      body: "--XYZ--",
      // @ts-expect-error node
      duplex: "half",
    });
    await POST(req, ctx("boards", "b1", "sources", "file"));
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.duplex).toBe("half");
    expect(init.body).toBeInstanceOf(ReadableStream);
    expect(new Headers(init.headers).get("content-type")).toBe(ct);
  });

  it("passes upstream status and body through", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "card_limit" }), { status: 409, headers: { "content-type": "application/json" } })
    );
    const res = await POST(
      new Request("http://t/api/engine/boards/b1/cards", { method: "POST", body: "{}", headers: { "content-type": "application/json" } }),
      ctx("boards", "b1", "cards")
    );
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "card_limit" });
  });

  it("sets SSE headers for event-stream", async () => {
    fetchMock.mockResolvedValue(
      new Response("data: [DONE]\n\n", { status: 200, headers: { "content-type": "text/event-stream" } })
    );
    const res = await POST(
      new Request("http://t/api/engine/chat/stream", { method: "POST", body: "{}", headers: { "content-type": "application/json" } }),
      ctx("chat", "stream")
    );
    expect(res.headers.get("cache-control")).toBe("no-cache, no-transform");
    expect(res.headers.get("x-accel-buffering")).toBe("no");
    expect(res.headers.get("content-type")).toContain("text/event-stream");
  });

  it("503 engine_unavailable when fetch throws", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await GET(new Request("http://t/api/engine/boards"), ctx("boards"));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "engine_unavailable" });
  });

  it.each([["..%2Fadmin"], [".."], ["a/b"], [""]])("rejects bad segment %j", async (seg) => {
    const res = await GET(new Request("http://t/api/engine/x"), ctx("boards", seg));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not forward cookie/authorization/host/connection", async () => {
    await GET(
      new Request("http://t/api/engine/boards", {
        headers: { cookie: "s=1", authorization: "Bearer evil", connection: "keep-alive", "x-keep": "1" },
      }),
      ctx("boards")
    );
    const h = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(h.get("cookie")).toBeNull();
    expect(h.get("authorization")).toBe("Bearer tok");
    expect(h.get("connection")).toBeNull();
    expect(h.get("host")).toBeNull();
  });
});
