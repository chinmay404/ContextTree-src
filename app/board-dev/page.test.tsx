afterEach(() => { vi.unstubAllEnvs(); });
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NEXT_NOT_FOUND'); } }));
// next/font throws outside Next, and the board needs a DOM: stand the board in for this server-page test.
vi.mock('../../components/board/Board', () => ({ Board: () => null, default: () => null }));
it('404s in production', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  const { default: Page } = await import('./page');
  await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow('NEXT_NOT_FOUND');
});
it('renders in development', async () => {
  vi.resetModules(); vi.stubEnv('NODE_ENV', 'development');
  const { default: Page } = await import('./page');
  expect(await Page({ searchParams: Promise.resolve({}) })).toBeTruthy();
});
