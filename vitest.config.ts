import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'components/board/**/*.test.ts',
      'components/board/**/*.test.tsx',
      'app/board-dev/**/*.test.tsx',
      'app/page.test.tsx',
      'components/shell/**/*.test.ts',
      'components/shell/**/*.test.tsx',
      'tests/unit/**/*.test.ts',
    ],
  },
  resolve: { alias: { '@': path.resolve(__dirname) } },
  // NODE_ENV stubbed to development would otherwise select the dev JSX runtime (jsxDEV), absent under vitest.
  esbuild: { jsx: 'automatic', jsxDev: false },
});
