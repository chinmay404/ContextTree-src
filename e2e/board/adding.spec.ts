import { test, expect, type Page } from '@playwright/test';
import { openBoard, trackErrors } from './helpers';

const noteCount = (page: Page) => page.evaluate(() => window.__board!.sources().filter((c) => c.sourceType === 'note').length);
const sourceCount = (page: Page) => page.evaluate(() => window.__board!.sources().length);
const paste = (page: Page, text: string) => page.evaluate((t) => {
  const dt = new DataTransfer();
  dt.setData('text/plain', t);
  document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
}, text);
const upload = async (page: Page, file: { name: string; mimeType: string; buffer: Buffer }) => {
  await page.click('[data-pb="add"]');
  const chooser = page.waitForEvent('filechooser');
  await page.click('[data-m="file"]');
  await (await chooser).setFiles(file);
};

test('Add → Note spawns a note ready to type into', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page);
  const n = await noteCount(page);
  await page.click('[data-pb="add"]');
  await page.click('[data-pb="menu"] [data-m="note"]');
  await page.keyboard.type('Ask Priya about the team plan');
  expect(await noteCount(page)).toBe(n + 1);
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => window.__board!.sources().some((c) => (c.data as { text?: string }).text === 'Ask Priya about the team plan'))).toBe(true);
  expect(errs).toEqual([]);
});

test('the menu has the prototype items and is out of reach when closed', async ({ page }) => {
  await openBoard(page);
  await expect(page.locator('[data-pb="menu"]')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('[data-pb="menu"]')).toHaveAttribute('inert', '');
  await page.click('[data-pb="add"]');
  await expect(page.locator('[data-pb="menu"] [data-m]')).toHaveText(['NoteN', 'New questionQ', 'Upload files', 'Paste a link or textV']);
  await expect(page.locator('[data-pb="menu"]')).toHaveAttribute('aria-hidden', 'false');
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.__board!.menuOpen())).toBe(false);
  await expect(page.locator('[data-pb="add"]')).toBeFocused();
});

test('right-click opens the menu; Escape closes it', async ({ page }) => {
  await openBoard(page);
  await page.mouse.click(700, 120, { button: 'right' });
  expect(await page.evaluate(() => window.__board!.menuOpen())).toBe(true);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.__board!.menuOpen())).toBe(false);
});

test('right-click → New question opens the root sheet at that spot', async ({ page }) => {
  await openBoard(page);
  await page.mouse.click(700, 120, { button: 'right' });
  await page.click('[data-pb="menu"] [data-m="chat"]');
  const d = await page.evaluate(() => window.__board!.dialog());
  expect(d?.mode).toBe('root');
  expect(d?.at).not.toBeNull();
});

test('Paste a link opens the paste box, adds https:// and makes a web card', async ({ page }) => {
  await openBoard(page, '?ingestMs=200');
  const n = await sourceCount(page);
  await page.click('[data-pb="add"]'); await page.click('[data-m="link"]');
  const input = page.locator('[data-pb="paste"] textarea');
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute('placeholder', 'Paste a link or some text');
  await input.fill('example.com/pricing');
  await page.click('[data-pb="paste"] [data-act="pb-add"]');
  expect(await sourceCount(page)).toBe(n + 1);
  const added = await page.evaluate(() => window.__board!.sources().find((c) => (c.data as { url?: string }).url?.includes('example.com/pricing')));
  expect(added?.sourceType).toBe('web');
  expect((added!.data as { url: string }).url).toBe('https://example.com/pricing');
  await expect(page.locator('[data-pb="paste"]')).toHaveAttribute('aria-hidden', 'true');
});

test('double-click empty board spawns a note; on a card it does not', async ({ page }) => {
  await openBoard(page);
  const n = await sourceCount(page);
  await page.mouse.dblclick(1300, 120);
  await page.waitForTimeout(100);
  expect(await sourceCount(page)).toBe(n + 1);
  const m = await page.locator('.card[data-id="pdf"] .meta').boundingBox();
  await page.mouse.dblclick(m!.x + m!.width / 2, m!.y + m!.height / 2);
  await page.waitForTimeout(200);
  expect(await sourceCount(page)).toBe(n + 1);
});

test('N and Q', async ({ page }) => {
  await openBoard(page);
  const n = await noteCount(page);
  await page.keyboard.press('n');
  await page.waitForTimeout(100);
  expect(await noteCount(page)).toBe(n + 1);
  await page.keyboard.press('Escape');                 // out of the new note's field
  await page.keyboard.press('q');
  expect((await page.evaluate(() => window.__board!.dialog()))?.mode).toBe('root');
  await page.keyboard.press('n');                      // a sheet is open: ignored
  expect(await noteCount(page)).toBe(n + 1);
});

test('Enter opens the selected chat or source', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => window.__board!.select('main'));
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => window.__board!.focus())).toBe('main');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__board!.select('pdf'));
  await page.keyboard.press('Enter');
  expect((await page.evaluate(() => window.__board!.viewer()))?.cardId).toBe('pdf');
});

test('one uploaded file asks what it is for', async ({ page }) => {
  await openBoard(page, '?ingestMs=200');
  const chooser = page.waitForEvent('filechooser');
  await page.click('[data-pb="add"]'); await page.click('[data-m="file"]');
  await (await chooser).setFiles({ name: 'survey.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });
  await expect(page.locator('.card.src.processing')).toHaveCount(1);
  await expect(page.locator('.card.src .desc:focus')).toHaveCount(1, { timeout: 5000 });
});

test('rejected uploads leave no card and say why', async ({ page }) => {
  await openBoard(page);
  const n = await sourceCount(page);
  await upload(page, { name: 'big.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(5 * 1024 * 1024) });
  await page.waitForTimeout(1000);
  expect(await sourceCount(page)).toBe(n);
  await expect(page.locator('.pb-toast')).toHaveText('That file is over 4 MB.');
  await upload(page, { name: 'clip.mov', mimeType: 'video/quicktime', buffer: Buffer.from('x') });
  await page.waitForTimeout(1000);
  expect(await sourceCount(page)).toBe(n);
  await expect(page.locator('.pb-toast')).toHaveText("Can't read that kind of file yet.");
});

test('a file that fails offers Retry and Paste text', async ({ page }) => {
  await openBoard(page, '?ingestMs=200');
  await upload(page, { name: 'broken.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });
  const failed = page.locator('.card.failed');
  await expect(failed).toHaveCount(1, { timeout: 5000 });
  await expect(failed.locator('[data-retry]')).toBeVisible();
  const notes = await noteCount(page);
  await failed.locator('[data-pastetext]').click();
  await expect(page.locator('.card.failed')).toHaveCount(0);
  expect(await noteCount(page)).toBe(notes + 1);
});

test('pasting a YouTube link makes a coming-soon video', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => window.__board!.select('main'));
  await paste(page, 'https://youtu.be/abc123');   // a paste opens the paste box with it; Enter adds
  await expect(page.locator('[data-pb="paste"] [data-act="pv-link"]')).toHaveAttribute('data-kind', 'video');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  const v = await page.evaluate(() => window.__board!.sources().find((c) => (c.data as { ytid?: string }).ytid === 'abc123'));
  expect(v).toBeTruthy();
  expect([v!.sourceType, v!.status, v!.deskId]).toEqual(['video', 'soon', 'main']);
});

test('pasting text makes a note', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => window.__board!.select('main'));
  await paste(page, 'Remember to ask about the discount tiers');   // text shows as a note in the paste box; Enter adds
  await expect(page.locator('[data-pb="paste"] [data-act="pv-note"]')).toContainText('Remember to ask about the discount tiers');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  const c = await page.evaluate(() => window.__board!.sources().find((x) => (x.data as { text?: string }).text === 'Remember to ask about the discount tiers'));
  expect(c).toBeTruthy();
  expect([c!.sourceType, (c!.data as { meta?: string }).meta, c!.deskId]).toEqual(['note', 'Note · pasted', 'main']);
});

test('pasting into a focused text field is left alone', async ({ page }) => {
  await openBoard(page);
  await page.keyboard.press('n');                      // a new note, its field focused; no overlay is open
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.__board!.dialog() === null && window.__board!.menuOpen() === false)).toBe(true);
  const n = await sourceCount(page);
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.setData('text/plain', 'https://example.com/x');
    document.activeElement!.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(300);
  expect(await sourceCount(page)).toBe(n);
});

test('dropping files on a desk gives them to that question', async ({ page }) => {
  await openBoard(page);
  const pt = await page.evaluate(() => {
    const b = window.__board!, [x0, , x1, y1] = b.deskBox('second')!, c = b.cam();
    return [((x0 + x1) / 2) * c.z + c.x, (y1 - 60) * c.z + c.y];   // low in the desk, clear of its cards
  });
  const send = (type: string) => page.evaluate(([t, x, y]) => {
    const dt = new DataTransfer();
    dt.items.add(new File(['# notes'], 'a.md', { type: 'text/markdown' }));
    window.dispatchEvent(new DragEvent(t as string, { dataTransfer: dt, clientX: x as number, clientY: y as number, bubbles: true, cancelable: true }));
  }, [type, pt[0], pt[1]] as const);
  await send('dragenter');
  await expect(page.locator('[data-pb="drop"].on')).toHaveCount(1);
  await expect(page.locator('[data-pb="drop"]')).toContainText('Drop on a desk to give it to that question.');
  await send('drop');
  await expect(page.locator('[data-pb="drop"].on')).toHaveCount(0);
  await page.waitForTimeout(300);
  const c = await page.evaluate(() => window.__board!.sources().find((x) => (x.data as { fileName?: string }).fileName === 'a.md'));
  expect(c?.deskId).toBe('second');
});

test('dropping a link makes a card on the desk under it', async ({ page }) => {
  await openBoard(page);
  const pt = await page.evaluate(() => {
    const b = window.__board!, [x0, , x1, y1] = b.deskBox('second')!, c = b.cam();
    return [((x0 + x1) / 2) * c.z + c.x, (y1 - 60) * c.z + c.y];
  });
  await page.evaluate(([x, y]) => {
    const dt = new DataTransfer();
    dt.setData('text/uri-list', 'https://example.org/report');
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, clientX: x, clientY: y, bubbles: true, cancelable: true }));
  }, pt as [number, number]);
  await page.waitForTimeout(300);
  const c = await page.evaluate(() => window.__board!.sources().find((x) => (x.data as { url?: string }).url === 'https://example.org/report'));
  expect([c?.sourceType, c?.deskId]).toEqual(['web', 'second']);
});

test('the focus view Source button opens the picker for that desk', async ({ page }) => {
  await openBoard(page, '?ingestMs=200');
  await page.evaluate(() => window.__board!.openFocus('main'));
  await page.waitForTimeout(700);
  const chooser = page.waitForEvent('filechooser');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('pb:pickfiles', { detail: { deskId: 'main' } })));
  await (await chooser).setFiles({ name: 'plan.txt', mimeType: 'text/plain', buffer: Buffer.from('plan') });
  await page.waitForTimeout(300);
  const c = await page.evaluate(() => window.__board!.sources().find((x) => (x.data as { fileName?: string }).fileName === 'plan.txt'));
  expect(c?.deskId).toBe('main');
});

const deskPoint = (page: Page) => page.evaluate(() => {
  const b = window.__board!, [x0, , x1, y1] = b.deskBox('second')!, c = b.cam();
  return [((x0 + x1) / 2) * c.z + c.x, (y1 - 60) * c.z + c.y] as [number, number];
});

test('a file drop is ignored while a sheet is open', async ({ page }) => {
  await openBoard(page);
  const pt = await deskPoint(page);
  await page.keyboard.press('q');
  expect((await page.evaluate(() => window.__board!.dialog()))?.mode).toBe('root');
  const n = await sourceCount(page);
  await page.evaluate(([x, y]) => {
    const dt = new DataTransfer();
    dt.items.add(new File(['x'], 'late.md', { type: 'text/markdown' }));
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, clientX: x, clientY: y, bubbles: true, cancelable: true }));
  }, pt);
  await page.waitForTimeout(300);
  expect(await sourceCount(page)).toBe(n);
});

test('a plain-text drag is not accepted', async ({ page }) => {
  await openBoard(page);
  const pt = await deskPoint(page);
  const n = await sourceCount(page);
  const prevented = await page.evaluate(([x, y]) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', 'https://example.com/plain');
    const over = new DragEvent('dragover', { dataTransfer: dt, clientX: x, clientY: y, bubbles: true, cancelable: true });
    window.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true }));
    window.dispatchEvent(over);
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, clientX: x, clientY: y, bubbles: true, cancelable: true }));
    return over.defaultPrevented;
  }, pt);
  await page.waitForTimeout(300);
  expect(prevented).toBe(false);
  await expect(page.locator('[data-pb="drop"].on')).toHaveCount(0);
  expect(await sourceCount(page)).toBe(n);
});

test('dropping several files lands cards that do not overlap', async ({ page }) => {
  await openBoard(page);
  const pt = await deskPoint(page);
  await page.evaluate(([x, y]) => {
    const dt = new DataTransfer();
    for (const name of ['one.md', 'two.md', 'three.md']) dt.items.add(new File(['# ' + name], name, { type: 'text/markdown' }));
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, clientX: x, clientY: y, bubbles: true, cancelable: true }));
  }, pt);
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__board!.settle());
  const boxes = await page.evaluate(() => {
    const b = window.__board!;
    return b.sources().filter((c) => /^(one|two|three)\.md$/.test((c.data as { fileName?: string }).fileName ?? '')).map((c) => b.box(c.id));
  });
  expect(boxes).toHaveLength(3);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const [a, b] = [boxes[i], boxes[j]];
    expect(a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3], `${i} overlaps ${j}`).toBe(false);
  }
});
