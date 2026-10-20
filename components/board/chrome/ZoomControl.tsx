'use client';
/** Zoom out / in / fit and the live zoom label (prototype 367, 852, 1206, 1282). */
import { useEffect, useRef, type ReactElement } from 'react';
import { useBoard } from '../context';
import { Icon } from './Icon';

export function ZoomControl(): ReactElement {
  const { engine } = useBoard();
  const label = useRef<HTMLSpanElement>(null);

  // The label follows the camera frame by frame, straight into the DOM (no React state per frame).
  useEffect(() => {
    if (!engine) return;
    const paint = () => {
      const t = Math.round(engine.zoom() * 100) + '%';
      if (label.current && label.current.textContent !== t) label.current.textContent = t;
    };
    paint();
    return engine.onFrame(paint);
  }, [engine]);

  useEffect(() => {
    if (!engine) return;
    const onResize = () => engine.fit(true);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [engine]);

  return (
    <div className="float" data-pb="zoom">
      <button type="button" data-z="out" aria-label="Zoom out" onClick={() => engine?.zoomBy(0.8)}><Icon name="minus" /></button>
      <span ref={label} className="z" aria-live="off">100%</span>
      <button type="button" data-z="in" aria-label="Zoom in" onClick={() => engine?.zoomBy(1.25)}><Icon name="plus" /></button>
      <button type="button" data-z="fit" aria-label="Fit board" onClick={() => engine?.fit(true)}><Icon name="maximize" /></button>
    </div>
  );
}
