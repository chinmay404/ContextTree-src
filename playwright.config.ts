import { defineConfig } from '@playwright/test';

const port = Number(process.env.PW_PORT ?? 3100);
const baseURL = process.env.PW_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // One worker: parallel page loads against the shared `next dev` on :3100 truncate chunks (ChunkLoadError).
  workers: 1,
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL,
    viewport: { width: 1440, height: 900 },
    // Every board test starts as a returning user, so the first-visit welcome tour stays shut. tour.spec.ts clears this.
    storageState: { cookies: [], origins: [{ origin: new URL(baseURL).origin, localStorage: [{ name: 'ct-tour', value: JSON.stringify({ version: 1e6, at: 0, finished: true }) }] }] },
  },
  webServer: process.env.PW_BASE_URL
    ? undefined
    : {
        command: `npx next dev --port ${port}`,
        url: `${baseURL}/board-dev`,
        reuseExistingServer: !process.env.CI,
        timeout: 600_000,
      },
  outputDir: 'test-results/board',
});
