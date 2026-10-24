import { test, expect, type Page } from '@playwright/test';
import { openBoard } from './helpers';

// The answer from the owner's screenshot: a parameter table and a fenced bash block used to render as one run-on paragraph.
const ANSWER = [
  '**Key parameters you must supply** (example command line for a Docker run):',
  '',
  '| Parameter | Example value | What it does |',
  '|-----------|---------------|--------------|',
  '| `-t` / `--target` | `https://staging.example.com` | Base URL to crawl and attack. |',
  '| `-c` / `--context` | `my-app.context` | Loads a pre-defined context (e.g., authenticated session, excluded URLs). |',
  '| `-n` / `--threads` | 4 | Number of concurrent scan threads (controls speed vs. load). |',
  '',
  '**Small step-by-step example**',
  '',
  '```bash',
  'docker run -v $(pwd)/zap:/zap \\',
  '  owasp/zap2docker-stable zap.sh -daemon -port 8090 \\',
  '  -t https://staging.example.com -r /zap/report.html -n 4 -T 600',
  '```',
  '',
  '> Run it against staging only.',
].join('\n');

const F = '[data-pb="focus"]';

async function seedAnswer(page: Page): Promise<void> {
  await page.evaluate(async (content) => {
    type Rec = { messages: Map<string, { role: string; content: string }[]> };
    const mock = window.__mock as unknown as { boards: Map<string, Rec> };
    const msgs = mock.boards.get('b_seed')!.messages.get('main')!;
    msgs.filter((m) => m.role === 'assistant').forEach((m) => { m.content = content; });
    await window.__board!.reload();
    window.__board!.rerender();
  }, ANSWER);
  await page.waitForTimeout(300);
}

for (const theme of ['light', 'dark'] as const) {
  test(`answers render tables and code blocks in the focus view and on the card (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await openBoard(page);
    await seedAnswer(page);

    const card = page.locator('.card.chat[data-id="main"] .ans').first();
    await expect(card.locator('table')).toHaveCount(1);
    await expect(card.locator('pre.md-code')).toHaveAttribute('data-lang', 'bash');
    await expect(card).not.toContainText('|---');
    await card.scrollIntoViewIfNeeded();
    await page.locator('.card.chat[data-id="main"]').screenshot({ path: `test-results/md-card-${theme}.png` });

    await page.evaluate(() => window.__board!.openFocus('main'));
    await page.waitForTimeout(700);
    const body = page.locator(`${F} .art .body`).first();
    const table = body.locator('.md-tw table');
    await expect(table.locator('th')).toHaveText(['Parameter', 'Example value', 'What it does']);
    await expect(table.locator('tbody tr')).toHaveCount(3);
    await expect(table.locator('tbody tr').first().locator('td').first().locator('code')).toHaveCount(2);
    const pre = body.locator('pre.md-code');
    await expect(pre).toContainText('docker run -v $(pwd)/zap:/zap \\');
    expect(await pre.evaluate((el) => getComputedStyle(el).whiteSpace)).toBe('pre');
    expect(await pre.evaluate((el) => el.textContent!.split('\n').length)).toBe(3);
    await expect(body.locator('blockquote')).toContainText('staging only');
    await expect(body).not.toContainText('```');
    // Wide tables and long lines scroll inside their own box; the page never scrolls sideways.
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over).toBeLessThanOrEqual(0);
    await body.screenshot({ path: `test-results/md-focus-${theme}.png` });
  });
}
