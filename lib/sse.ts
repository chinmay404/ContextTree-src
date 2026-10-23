/**
 * Incremental SSE line parser (ported from the V2 loop in contextual-console.tsx).
 * Feed each decoded chunk plus the previous carry; returns parsed JSON events,
 * the unfinished tail, and whether `data: [DONE]` was seen. Non-JSON data lines are skipped.
 */
export function parseSse(
  chunk: string,
  carry: string
): { events: unknown[]; carry: string; done: boolean } {
  const lines = (carry + chunk).split("\n");
  const rest = lines.pop() ?? "";
  const events: unknown[] = [];
  let done = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const data = trimmed.slice(5).trim();
    if (!data) continue;
    if (data === "[DONE]") {
      done = true;
      continue;
    }
    try {
      events.push(JSON.parse(data));
    } catch {
      /* skip non-JSON */
    }
  }
  return { events, carry: rest, done };
}
