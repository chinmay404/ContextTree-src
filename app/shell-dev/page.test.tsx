afterEach(() => { vi.unstubAllEnvs(); });
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NEXT_NOT_FOUND'); }, useSearchParams: () => new URLSearchParams() }));
vi.mock('@/components/shell/landing/LandingV3', () => ({ LandingV3: () => null }));
vi.mock('@/components/shell/signin/SignInV3', () => ({ SignInV3: () => null }));
const sp = (screen?: string) => Promise.resolve(screen ? { screen } : {});
it('404s in production', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  const { default: Page } = await import('./page');
  await expect(Page({ searchParams: sp('landing') })).rejects.toThrow('NEXT_NOT_FOUND');
});
it('renders the landing page and the sign-in sheet in development, and 404s for anything else', async () => {
  vi.resetModules(); vi.stubEnv('NODE_ENV', 'development');
  const { default: Page } = await import('./page');
  expect(await Page({ searchParams: sp('landing') })).toBeTruthy();
  expect(await Page({ searchParams: sp('signin') })).toBeTruthy();
  await expect(Page({ searchParams: sp() })).rejects.toThrow('NEXT_NOT_FOUND');
  await expect(Page({ searchParams: sp('nope') })).rejects.toThrow('NEXT_NOT_FOUND');
});
