/**
 * Which touches may draw. Once a stylus has been used on this device only the stylus and a mouse draw,
 * so a resting palm does nothing. It is remembered, because a palm usually lands before the pen does.
 */
const KEY = 'ct-stylus';

export type PenVerdict = 'draw' | 'replace' | 'ignore';

interface MemoryStore { getItem(key: string): string | null; setItem(key: string, value: string): void }

export class PalmGuard {
  private stylus: boolean;

  constructor(private readonly memory: () => MemoryStore | null) {
    let seen = false;
    try { seen = memory()?.getItem(KEY) === '1'; } catch { /* private window: learn it again */ }
    this.stylus = seen;
  }

  /** `active` is the pointer type of the stroke in progress, if any. 'replace': drop it and start this one. */
  down(type: string, active: string | null): PenVerdict {
    if (type === 'pen') {
      if (!this.stylus) {
        this.stylus = true;
        try { this.memory()?.setItem(KEY, '1'); } catch { /* it still holds until the page reloads */ }
      }
      if (active === 'pen') return 'ignore';
      return active ? 'replace' : 'draw';
    }
    if (type === 'touch' && this.stylus) return 'ignore';
    return active ? 'ignore' : 'draw';
  }
}

export const palmGuard = new PalmGuard(() => (typeof window === 'undefined' ? null : window.localStorage));

type Point = [number, number] | [number, number, number];

/** Every point the hardware reported since the last event: a stylus reports far more than the screen draws. */
export function pointsOf(e: PointerEvent, at: (clientX: number, clientY: number) => [number, number]): Point[] {
  const events = e.getCoalescedEvents?.() ?? [];
  return (events.length ? events : [e]).map((p): Point => {
    const [x, y] = at(p.clientX, p.clientY);
    return e.pointerType === 'pen' ? [x, y, p.pressure] : [x, y];
  });
}
