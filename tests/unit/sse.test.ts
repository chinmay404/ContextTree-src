import { describe, it, expect } from "vitest";
import { parseSse } from "@/lib/sse";

describe("parseSse", () => {
  it("joins frames split across chunks and detects [DONE]", () => {
    const a = parseSse('data: {"message":"Hel', "");
    expect(a.events).toEqual([]);
    expect(a.done).toBe(false);
    const b = parseSse('lo"}\n\ndata: [DONE]\n\n', a.carry);
    expect(b.events).toEqual([{ message: "Hello" }]);
    expect(b.done).toBe(true);
  });
  it("handles CRLF", () => {
    const r = parseSse('data: {"message":"x"}\r\n\r\ndata: [DONE]\r\n\r\n', "");
    expect(r.events).toEqual([{ message: "x" }]);
    expect(r.done).toBe(true);
  });
  it("skips non-JSON data lines", () => {
    const r = parseSse('data: nope\n\ndata: {"a":1}\n\n', "");
    expect(r.events).toEqual([{ a: 1 }]);
    expect(r.done).toBe(false);
  });
});
