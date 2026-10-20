'use client';
/**
 * The first-visit welcome tour: a modal of six slides, one board word each (chat, source, desk, string, branch, pile),
 * each with a looping scene. Opens by itself per tour/tour-state.ts; the board menu's "Take the tour" replays it.
 * Design source: docs/design/onboarding-tour.html.
 */
import './welcome-tour.css';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactElement } from 'react';
import { useBoard, useSnapshot } from '../context';
import { useEscape } from './escape';
import { Icon } from './Icon';
import { SLIDES } from './tour/slides';
import { SCENES } from './tour/TourScenes';
import { readTourSeen, shouldShowTour, writeTourSeen } from './tour/tour-state';

const FADE_MS = 280;   // matches the scrim and scene transitions in welcome-tour.css
const STAGE_W = 640;

export function WelcomeTour(): ReactElement | null {
  const { store } = useBoard();
  const open = useSnapshot().ui.tour;
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const [at, setAt] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const boxRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);

  // First visit (or a newer tour): open once the board is up.
  useEffect(() => { if (shouldShowTour(readTourSeen())) store.openTour(); }, [store]);

  // Mount → fade in; close → fade out → unmount, so the scene cards are only in the DOM while the tour is up.
  useEffect(() => {
    if (open) {
      setAt(0); setLeaving(null); setMounted(true);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), FADE_MS);
    return () => clearTimeout(t);
  }, [open]);

  const close = useCallback((finished: boolean) => {
    writeTourSeen(finished);
    store.closeTour();
  }, [store]);
  useEscape(open, () => close(false));

  const go = useCallback((i: number) => {
    const n = Math.max(0, Math.min(SLIDES.length - 1, i));
    if (n === at) return;
    setLeaving(at);   // the old scene keeps animating while it fades, or its props snap home mid-fade
    setAt(n);
  }, [at]);
  useEffect(() => {
    if (leaving === null) return;
    const t = setTimeout(() => setLeaving(null), FADE_MS + 40);
    return () => clearTimeout(t);
  }, [leaving]);

  // Focus: into the dialog on open, back to whoever opened it on close.
  useLayoutEffect(() => {
    if (open) {
      wasOpen.current = true;
      if (!opener.current) opener.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
      if (mounted) nextRef.current?.focus({ preventScroll: true });
      return;
    }
    if (!wasOpen.current) return;   // never opened (or already handed focus back): leave focus alone
    wasOpen.current = false;
    const o = opener.current;
    opener.current = null;
    const a = document.activeElement;
    if (a && a !== document.body && boxRef.current && !boxRef.current.contains(a)) return;   // something else already took focus
    if (o?.isConnected && !o.closest('[inert]')) { o.focus({ preventScroll: true }); return; }
    const root = boxRef.current?.closest<HTMLElement>('.pb-root');
    if (root) { if (!root.hasAttribute('tabindex')) root.tabIndex = -1; root.focus({ preventScroll: true }); }
  }, [open, mounted]);

  // Arrows step through; Tab stays inside the dialog. Escape goes through the board's escape stack (useEscape).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(at + 1); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(at - 1); return; }
      if (e.key !== 'Tab') return;
      const f = [...(boxRef.current?.querySelectorAll<HTMLButtonElement>('button:not([hidden])') ?? [])];
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1], a = document.activeElement;
      if (e.shiftKey && (a === first || !boxRef.current?.contains(a))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (a === last || !boxRef.current?.contains(a))) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, at, go]);

  // The stage is drawn at 640×320 and scaled to the dialog's width.
  useLayoutEffect(() => {
    const v = viewRef.current;
    if (!mounted || !v) return;
    const fit = (): void => setScale(v.clientWidth / STAGE_W || 1);
    fit();
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null;
    ro?.observe(v);
    return () => ro?.disconnect();
  }, [mounted]);

  if (!mounted) return null;
  const s = SLIDES[at], last = at === SLIDES.length - 1;

  return (
    <div className={`pb-tour${shown && open ? ' on' : ''}`} data-pb="tour" onPointerDown={(e) => { if (e.target === e.currentTarget) close(false); }}>
      <div ref={boxRef} className="t-box" role="dialog" aria-modal="true" aria-labelledby="pb-tour-h" aria-describedby="pb-tour-p">
        <button type="button" className="t-close" aria-label="Close the tour" onClick={() => close(false)}><Icon name="x" size={18} /></button>

        <div ref={viewRef} className="t-view" aria-hidden="true">
          <div className="t-stage" style={{ transform: `scale(${scale})` }}>
            {SLIDES.map((sl, i) => {
              const Scene = SCENES[sl.scene];
              const cls = i === at ? ' on' : i < at ? ' left' : '';
              const play = i === at || i === leaving ? ' play' : '';
              return <div key={sl.scene} className={`t-scene t-${sl.scene}${cls}${play}`}><Scene /></div>;
            })}
          </div>
        </div>

        <div className="t-copy">
          <div key={at} className="t-copy-in">
            <span className="t-term"><Icon name={s.icon} size={13} />{s.term}</span>
            <h2 id="pb-tour-h">{s.title}</h2>
            <p id="pb-tour-p">{s.body}</p>
          </div>
          <div className="t-nav">
            <button type="button" className="t-skip" onClick={() => close(false)}>Skip tour</button>
            <div className="t-pips" role="group" aria-label="Tour steps">
              {SLIDES.map((sl, i) => (
                <button key={sl.scene} type="button" aria-label={`Step ${i + 1}: ${sl.term}`} aria-current={i === at ? 'step' : undefined} onClick={() => go(i)} />
              ))}
            </div>
            <div className="t-btns">
              <button type="button" className="btn" hidden={at === 0} onClick={() => go(at - 1)}>Back</button>
              <button ref={nextRef} type="button" className="btn primary" data-act="next" onClick={() => (last ? close(true) : go(at + 1))}>
                {last ? 'Start building' : 'Next'}<Icon name="arrow-right" size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
