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
  mint.mockReset();
  mint.mockResolvedValue("tok");
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () =>
    new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } })
  );
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("resolveEngineBase", () => {
  it("strips /api/v1/chat", () => {
    process.env.LLM_API_URL = "https://x.app/api/v1/chat";
    expect(resolveEngineBase()).toBe("https://x.app");
  });
  it("handles trailing slash", () => {
    process.env.LLM_API_URL = "http://localhost:8000/api/v1/chat/";
    expect(resolveEngineBase()).toBe("http://localhost:8000");
  });
  it("strips from the pathname only (query/host untouched)", () => {
    process.env.LLM_API_URL = "https://chat.example.com/api/v1/chat?x=/chat#y";
    expect(resolveEngineBase()).toBe("https://chat.example.com");
  });
  it("keeps a path prefix", () => {
    process.env.LLM_API_URL = "https://h.io/engine/api/v1/chat";
    expect(resolveEngineBase()).toBe("https://h.io/engine");
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
    fetchMock.mockImplementation(async () =>
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
    fetchMock.mockImplementation(async () =>
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

  it("503 engine_unavailable when fetch throws (logged)", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await GET(new Request("http://t/api/engine/boards"), ctx("boards"));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "engine_unavailable" });
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it.each([["..%2Fadmin"], [".."], ["a/b"], [""], ["%2e%2e"], ["a\\b"], ["%252e"], ["%2e"]])(
    "rejects bad segment %j",
    async (seg) => {
      const res = await GET(new Request("http://t/api/engine/x"), ctx("boards", seg));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "invalid" });
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  it("forwards only allow-listed headers", async () => {
    await GET(
      new Request("http://t/api/engine/boards", {
        headers: {
          cookie: "s=1", authorization: "Bearer evil", connection: "keep-alive",
          "x-forwarded-for": "1.2.3.4", "x-forwarded-host": "evil", forwarded: "for=1", "x-real-ip": "1.2.3.4",
          origin: "http://evil", accept: "application/json", "accept-language": "en", range: "bytes=0-1",
        },
      }),
      ctx("boards")
    );
    const h = new Headers(fetchMock.mock.calls[0][1].headers);
    for (const k of ["cookie", "x-forwarded-for", "x-forwarded-host", "forwarded", "x-real-ip", "origin", "connection"]) {
      expect(h.get(k), k).toBeNull();
    }
    expect(h.get("authorization")).toBe("Bearer tok");
    expect(h.get("accept")).toBe("application/json");
    expect(h.get("accept-language")).toBe("en");
    expect(h.get("range")).toBe("bytes=0-1");
  });

  it("raw binary passthrough keeps file headers, strips set-cookie", async () => {
    fetchMock.mockImplementation(async () =>
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": 'attachment; filename="a.pdf"',
          "x-content-type-options": "nosniff",
          "content-security-policy": "sandbox",
          "set-cookie": "evil=1",
        },
      })
    );
    const res = await GET(new Request("http://t/api/engine/files/c_1/raw"), ctx("files", "c_1", "raw"));
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toContain("attachment");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-security-policy")).toBe("sandbox");
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("204 has a null body", async () => {
    fetchMock.mockImplementation(async () => new Response(null, { status: 204 }));
    const res = await GET(new Request("http://t/api/engine/boards/b1"), ctx("boards", "b1"));
    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
  });

  it("3xx from the engine -> 502, no Location leaked", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockImplementation(async () => new Response(null, { status: 302, headers: { location: "http://evil" } }));
    const res = await GET(new Request("http://t/api/engine/boards"), ctx("boards"));
    expect(res.status).toBe(502);
    expect(res.headers.get("location")).toBeNull();
    expect(await res.json()).toEqual({ error: "engine_unavailable" });
    err.mockRestore();
  });

  it("logs and returns 503 when token minting fails", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    mint.mockRejectedValue(new Error("no secret"));
    const res = await GET(new Request("http://t/api/engine/boards"), ctx("boards"));
    expect(res.status).toBe(503);
    expect(err).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    err.mockRestore();
  });

  it("header timeout -> 503 for non-stream requests", async () => {
    vi.useFakeTimers();
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockImplementation(
      (_u: string, init: RequestInit) =>
        new Promise((_r, rej) =>
          init.signal!.addEventListener("abort", () => rej(new DOMException("t", "AbortError")))
        )
    );
    const p = GET(new Request("http://t/api/engine/boards"), ctx("boards"));
    await vi.advanceTimersByTimeAsync(30_001);
    const res = await p;
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "engine_unavailable" });
    err.mockRestore();
  });

  it("timer is cleared once headers arrive (body is not cut)", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementation(async (_u: string, init: RequestInit) => {
      signal = init.signal!;
      return new Response("ok", { status: 200 });
    });
    const res = await GET(new Request("http://t/api/engine/boards"), ctx("boards"));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(signal!.aborted).toBe(false);
    expect(await res.text()).toBe("ok");
  });

  it("stream request ignores the timeout and follows req.signal", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementation(async (_u: string, init: RequestInit) => {
      signal = init.signal!;
      return new Response("data: [DONE]\n\n", { status: 200, headers: { "content-type": "text/event-stream" } });
    });
    const ac = new AbortController();
    await POST(
      new Request("http://t/api/engine/chat/stream", { method: "POST", body: "{}", signal: ac.signal }),
      ctx("chat", "stream")
    );
    await vi.advanceTimersByTimeAsync(120_000);
    expect(signal!.aborted).toBe(false);
    ac.abort();
    expect(signal!.aborted).toBe(true);
  });

  it("ingest holds its request open: no header timeout, abort follows the browser", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementation(async (_u: string, init: RequestInit) => {
      signal = init.signal!;
      return new Response("{}", { status: 200 });
    });
    const p = POST(new Request("http://t/api/engine/boards/b1/cards/c1/ingest", { method: "POST" }), ctx("boards", "b1", "cards", "c1", "ingest"));
    await vi.advanceTimersByTimeAsync(120_000);
    expect(signal!.aborted).toBe(false);
    expect((await p).status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/boards/b1/cards/c1/ingest");
  });

  it("allows the longest Vercel Hobby duration", async () => {
    const mod = await import("@/app/api/engine/[...path]/route");
    expect(mod.maxDuration).toBe(300);
  });

  it("accept: text/event-stream on another path still gets the header timeout", async () => {
    vi.useFakeTimers();
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockImplementation(
      (_u: string, init: RequestInit) =>
        new Promise((_r, rej) =>
          init.signal!.addEventListener("abort", () => rej(new DOMException("t", "AbortError")))
        )
    );
    const p = GET(
      new Request("http://t/api/engine/boards", { headers: { accept: "text/event-stream" } }),
      ctx("boards")
    );
    await vi.advanceTimersByTimeAsync(30_001);
    expect((await p).status).toBe(503);
    err.mockRestore();
  });
});
