/**
 * What a mouse user gets from a right-click and a double-click, for a finger on the board. iPad Safari
 * sends neither here, because the board takes over its touches. A hold opens the same menus, and a
 * double tap on empty board makes a note.
 */
const HOLD_MS = 500;
const MOVE_SLOP_PX = 10;
const DOUBLE_TAP_MS = 350;
const DOUBLE_TAP_PX = 30;

interface TouchGestureHandlers {
  /** A hold on a card (with its id) or on empty board, which isn't in a field and has nothing over it. */
  hold(cardId: string | null, x: number, y: number): void;
  doubleTap(x: number, y: number): void;
  /** False while the pen is on or a sheet is open: then a touch isn't for these gestures. */
  active(): boolean;
}

export function attachTouchGestures(vp: HTMLElement, on: TouchGestureHandlers): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let start: { id: number; x: number; y: number; t: number } | null = null;
  let held = false;
  let lastTap: { x: number; y: number; t: number } | null = null;
  const fingers = new Set<number>();

  const cancelHold = (): void => {
    if (timer) { clearTimeout(timer); timer = null; }
  };

  const down = (e: PointerEvent): void => {
    if (e.pointerType !== 'touch') return;
    fingers.add(e.pointerId);
    held = false;
    if (fingers.size > 1 || !on.active()) { cancelHold(); start = null; lastTap = null; return; }
    const t = e.target instanceof Element ? e.target : null;
    // Text keeps the system's own hold: selecting a passage, the copy menu, a link.
    if (t?.closest('textarea, input, select, button, a[href], [contenteditable], .cbody, .note-in .n, .port, .wk')) { start = null; return; }
    start = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
    const cardId = t?.closest<HTMLElement>('.card[data-id]')?.dataset.id ?? null;
    const { clientX: x, clientY: y } = e;
    timer = setTimeout(() => {
      timer = null;
      held = true;
      lastTap = null;
      on.hold(cardId, x, y);
    }, HOLD_MS);
  };

  const move = (e: PointerEvent): void => {
    if (start?.id === e.pointerId && Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_SLOP_PX) {
      cancelHold();
      start = null;
      lastTap = null;
    }
  };

  const up = (e: PointerEvent): void => {
    if (e.pointerType !== 'touch') return;
    fingers.delete(e.pointerId);
    cancelHold();
    if (start?.id !== e.pointerId || held) { start = null; return; }
    const now = performance.now(), { x, y } = start;
    start = null;
    if (document.elementFromPoint(x, y)?.closest('.card')) { lastTap = null; return; }
    if (lastTap && now - lastTap.t < DOUBLE_TAP_MS && Math.hypot(x - lastTap.x, y - lastTap.y) < DOUBLE_TAP_PX) {
      lastTap = null;
      on.doubleTap(x, y);
    } else {
      lastTap = { x, y, t: now };
    }
  };

  const gone = (e: PointerEvent): void => {
    fingers.delete(e.pointerId);
    cancelHold();
    start = null;
  };

  vp.addEventListener('pointerdown', down, true);
  vp.addEventListener('pointermove', move, true);
  vp.addEventListener('pointerup', up, true);
  vp.addEventListener('pointercancel', gone, true);
  return () => {
    cancelHold();
    vp.removeEventListener('pointerdown', down, true);
    vp.removeEventListener('pointermove', move, true);
    vp.removeEventListener('pointerup', up, true);
    vp.removeEventListener('pointercancel', gone, true);
  };
}

/** How much of the layout the on-screen keyboard covers, in px. */
export function keyboardInset(layoutHeight: number, view: { height: number; offsetTop: number } | null | undefined): number {
  if (!view) return 0;
  const covered = Math.round(layoutHeight - view.height - view.offsetTop);
  return covered > 80 ? covered : 0;   // less than this is the browser's own bar moving, not a keyboard
}
