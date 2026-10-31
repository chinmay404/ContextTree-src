import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isIos, promptInstall, resetInstallOfferForTests, watchInstallOffer, installWay } from '../../lib/pwa';

type Strategy = (url: URL, request: { method: string; mode: string }, origin: string) => string;

function loadStrategy(): Strategy {
  const source = readFileSync('public/sw.js', 'utf8');
  const fakeSelf = { addEventListener() {}, location: { origin: 'https://contexttree.tech' } };
  return new Function('self', `${source}\nreturn strategyFor;`)(fakeSelf) as Strategy;
}

describe('what the service worker may keep', () => {
  const strategyFor = loadStrategy();
  const origin = 'https://contexttree.tech';
  const go = (path: string, mode = 'cors', method = 'GET') => strategyFor(new URL(path, origin), { method, mode }, origin);

  it.each([
    '/api/engine/boards', '/api/auth/session', '/api/user-api-keys', '/boards', '/b/b_123', '/manifest.webmanifest',
  ])('never stores %s', (path) => {
    expect(go(path)).toBe('network');
  });

  it('never stores a private page: a navigation goes to the network', () => {
    expect(go('/b/b_123', 'navigate')).toBe('navigate');
  });

  it('keeps build files and icons, which are the same for everyone', () => {
    expect(go('/_next/static/chunks/a1b2.js')).toBe('static');
    expect(go('/icons/icon-192.png')).toBe('static');
  });

  it('leaves writes and other sites alone', () => {
    expect(go('/_next/static/a.js', 'cors', 'POST')).toBe('network');
    expect(strategyFor(new URL('https://api.openai.com/v1/x'), { method: 'GET', mode: 'cors' }, origin)).toBe('network');
  });

  it('cannot store a board by any other path', () => {
    const source = readFileSync('public/sw.js', 'utf8');
    expect(source).not.toMatch(/PRECACHE = \[[^\]]*(boards|\/b\/|\/api)/);
    expect(source.match(/cache\.put/g)).toHaveLength(1);   // the one write, in the static branch
  });
});

describe('isIos', () => {
  it('spots iPhones and iPads, including an iPad asking for desktop sites', () => {
    expect(isIos('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe(true);
    expect(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true);
  });

  it('leaves a real Mac and Android out', () => {
    expect(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false);
    expect(isIos('Mozilla/5.0 (Linux; Android 14)', 5)).toBe(false);
  });
});

describe('the install offer', () => {
  afterEach(() => { resetInstallOfferForTests(); vi.unstubAllGlobals(); });

  const browser = (matches = false) => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches }) });
    vi.stubGlobal('navigator', { userAgent: 'Chrome', maxTouchPoints: 0 });
  };
  const offerIt = () => {
    const handlers: Record<string, (e: Event) => void> = {};
    watchInstallOffer({ addEventListener: (name: string, fn: (e: Event) => void) => { handlers[name] = fn; } } as never);
    const event = Object.assign(new Event('beforeinstallprompt'), { prompt: vi.fn(async () => {}) });
    handlers.beforeinstallprompt(event);
    return { event, handlers };
  };

  it('nothing to offer until the browser offers', () => {
    browser();
    expect(installWay()).toBeNull();
  });

  it('keeps the offer and uses it once', async () => {
    browser();
    const { event } = offerIt();
    expect(installWay()).toBe('prompt');
    await promptInstall();
    expect(event.prompt).toHaveBeenCalledOnce();
    expect(installWay()).toBeNull();
  });

  it('already installed: nothing to offer', () => {
    browser(true);
    offerIt();
    expect(installWay()).toBeNull();
  });

  it('once installed the offer is gone', () => {
    browser();
    const { handlers } = offerIt();
    handlers.appinstalled(new Event('appinstalled'));
    expect(installWay()).toBeNull();
  });
});
