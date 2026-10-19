import type { Card } from '../api/types';

/** Local values of in-flight patches; they win over the server copy until the call settles. */
export type CardOverride = { fields: Partial<Omit<Card, 'data'>>; data: Record<string, unknown> };

export function mergeCard(server: Card, o?: CardOverride): Card {
  if (!o) return server;
  return { ...server, ...o.fields, data: { ...server.data, ...o.data } as Card['data'] };
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

/** Top-level keys whose values differ between two entities. */
export function changedFields(a: object, b: object): string[] {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].filter((k) => !deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

/**
 * Per-entity reconcile of local state against a server list. Never a whole replace:
 * unchanged entities keep identity, pinned local ones survive, and only differing ids are reported.
 * A server entity that is `hidden` locally is treated as absent.
 */
export function reconcile<T extends { id: string }>(local: ReadonlyMap<string, T>, server: T[], opts: {
  pinned: ReadonlySet<string>; hidden: ReadonlySet<string>; merge: (s: T, id: string) => T; same: (a: T, b: T) => boolean;
}): { next: Map<string, T>; changed: { id: string; fields: string[] }[]; removed: string[] } {
  const next = new Map<string, T>();
  const changed: { id: string; fields: string[] }[] = [];
  const seen = new Set<string>();
  for (const s of server) {
    if (opts.hidden.has(s.id) || seen.has(s.id)) continue;
    seen.add(s.id);
    const merged = opts.merge(s, s.id);
    const had = local.get(s.id);
    if (!had) {
      next.set(s.id, merged);
      changed.push({ id: s.id, fields: ['created'] });
    } else if (opts.same(had, merged)) {
      next.set(s.id, had);
    } else {
      next.set(s.id, merged);
      changed.push({ id: s.id, fields: changedFields(had, merged) });
    }
  }
  const removed: string[] = [];
  for (const [id, v] of local) {
    if (seen.has(id)) continue;
    if (opts.pinned.has(id) && !opts.hidden.has(id)) next.set(id, v);
    else removed.push(id);
  }
  return { next, changed, removed };
}
