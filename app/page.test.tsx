import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getCurrentUser = vi.fn();
vi.mock('@/lib/auth-utils', () => ({ getCurrentUser: () => getCurrentUser() }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => { throw new Error(`NEXT_REDIRECT:${url}`); },
}));
// The studio is a big client page and the landing pulls in next/font: stand both in for this server-page test.
vi.mock('./home-client', () => ({ default: function HomeClient() { return null; } }));
vi.mock('@/components/shell/landing/LandingV3', () => ({ LandingV3: function LandingV3() { return null; } }));

beforeEach(() => { vi.resetModules(); getCurrentUser.mockReset(); });
afterEach(() => { vi.unstubAllEnvs(); });

describe('app/page', () => {
  it('flag off: the V2 studio, no metadata of its own', async () => {
    vi.stubEnv('NEXT_PUBLIC_BOARD_V3', '');
    const mod = await import('./page');
    const { default: HomeClient } = await import('./home-client');
    const el = await mod.default();
    expect((el as { type: unknown }).type).toBe(HomeClient);
    expect(await mod.generateMetadata()).toEqual({});
  });

  it('flag on with a user: redirect to /boards', async () => {
    vi.stubEnv('NEXT_PUBLIC_BOARD_V3', '1');
    getCurrentUser.mockResolvedValue({ email: 'sam@example.com' });
    const mod = await import('./page');
    await expect(mod.default()).rejects.toThrow('NEXT_REDIRECT:/boards');
  });

  it('flag on, signed out: the landing and the V3 title', async () => {
    vi.stubEnv('NEXT_PUBLIC_BOARD_V3', '1');
    getCurrentUser.mockResolvedValue(undefined);
    const mod = await import('./page');
    const { LandingV3 } = await import('@/components/shell/landing/LandingV3');
    const el = await mod.default();
    expect((el as { type: unknown }).type).toBe(LandingV3);
    const md = await mod.generateMetadata();
    expect(md.title).toEqual({ absolute: 'Context Tree — give every question its own desk' });
    expect(md.alternates?.canonical).toBe('/');
  });
});
