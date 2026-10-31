'use client';
import { useEffect } from 'react';
import { watchInstallOffer } from '@/lib/pwa';

// Off in development, where cached build files would hide your own changes. The PWA test switches it on.
const ENABLED = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_PWA_DEV === '1';

/** Registers the service worker and keeps the browser's install offer for the board menu. */
export function PwaRegister(): null {
  useEffect(() => {
    watchInstallOffer(window);
    if (!ENABLED || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch((e: unknown) => {
      console.error('Service worker not registered:', e);
    });
  }, []);
  return null;
}
