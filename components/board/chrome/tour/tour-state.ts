/** Whether the welcome tour opens on its own, and what we remember about it (localStorage, per browser). */

export const TOUR_KEY = 'ct-tour';
/** Bump when the tour gains slides: everyone sees it once more. */
export const TOUR_VERSION = 1;

export interface TourSeen { version: number; at: number; finished: boolean }

/**
 * First visit → show. A newer TOUR_VERSION → show once more, even to people who skipped, since there is something new.
 * Otherwise never: a skip means "not now, not later", and the board menu can always replay it.
 */
export function shouldShowTour(seen: TourSeen | null, version: number = TOUR_VERSION): boolean {
  if (!seen) return true;
  return seen.version < version;
}

const store = (): Storage | null => {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }   // blocked storage throws on access
};

/** What we stored last time, or null (never seen, unreadable, or not ours). */
export function readTourSeen(s: Storage | null = store()): TourSeen | null {
  try {
    const v: unknown = JSON.parse(s?.getItem(TOUR_KEY) ?? 'null');
    if (!v || typeof v !== 'object') return null;
    const o = v as Record<string, unknown>;
    if (typeof o.version !== 'number' || !Number.isFinite(o.version)) return null;
    return { version: o.version, at: typeof o.at === 'number' ? o.at : 0, finished: o.finished === true };
  } catch { return null; }
}

/** Remembers that the tour was closed. A failed write only means the tour shows again next time. */
export function writeTourSeen(finished: boolean, s: Storage | null = store(), now: number = Date.now()): void {
  try { s?.setItem(TOUR_KEY, JSON.stringify({ version: TOUR_VERSION, at: now, finished } satisfies TourSeen)); } catch { /* private mode, quota */ }
}
