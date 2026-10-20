// `next lint` is gone in Next 16: run eslint directly, on the eslintrc config (not the flat-config default of eslint 9).
// With no arguments it lints the board code (the rest of the repo predates the lint setup and has its own backlog).
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const args = process.argv.slice(2);
const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'node_modules', 'eslint', 'bin', 'eslint.js'), ...(args.length ? args : ['components/board', 'app/board-dev', 'e2e'])], {
  stdio: 'inherit',
  env: { ...process.env, ESLINT_USE_FLAT_CONFIG: 'false' },
});
process.exit(r.status ?? 1);
