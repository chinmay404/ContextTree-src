/** Installing Context Tree as an app. Browsers offer it differently, and iPhones and iPads not at all. */

interface InstallPrompt extends Event { prompt(): Promise<void> }

let offer: InstallPrompt | null = null;

/** The browser's install offer arrives once, early: keep it for when the user asks. */
export function watchInstallOffer(target: Pick<Window, 'addEventListener'>): void {
  target.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); offer = e as InstallPrompt; });
  target.addEventListener('appinstalled', () => { offer = null; });
}

export const isIos = (userAgent: string, touchPoints = 0): boolean =>
  /iphone|ipad|ipod/i.test(userAgent) || (/macintosh/i.test(userAgent) && touchPoints > 1);   // an iPad asks for desktop sites

const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export type InstallWay = 'prompt' | 'ios' | null;

/** How this browser can install the app right now; null when it can't, or already has. */
export function installWay(): InstallWay {
  if (typeof window === 'undefined' || isStandalone()) return null;
  if (offer) return 'prompt';
  return isIos(navigator.userAgent, navigator.maxTouchPoints) ? 'ios' : null;
}

export async function promptInstall(): Promise<void> {
  const current = offer;
  offer = null;   // a browser's offer works once
  await current?.prompt();
}

export function resetInstallOfferForTests(): void { offer = null; }
