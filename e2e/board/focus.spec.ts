import { test, expect, type Page } from '@playwright/test';
import { openBoard, trackErrors } from './helpers';

const F = '[data-pb="focus"]';
const openFocus = async (page: Page, id: string) => { await page.evaluate((i) => window.__board!.openFocus(i), id); await page.waitForTimeout(700); };
const more = (page: Page) => page.click(`${F} [data-act="more"]`);

test('opening a chat shows its timeline and connected sources', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page); await openFocus(page, 'deep');
  await expect(page.locator(`${F} .tl .cur`)).toContainText('Q1.2.1');
  await expect(page.locator(`${F} .tl button.st`)).toHaveCount(2);
  await expect(page.locator(`${F} .tl .ev`).first()).toContainText('Branched');
  // own 3 (desk shot, wire csv, answer side) + web + one pile row + main's 3
  await expect(page.locator(`${F} .srow`)).toHaveCount(8);
  const pile = page.locator(`${F} .srow`, { hasText: 'Customer interviews' });
  await expect(pile).toContainText('4 files');
  await expect(pile.locator('.qchip')).toHaveText('Q1.2');
  await expect(page.locator(`${F} .ftitle`)).toHaveText('Would a team plan change this?');
  await expect(page.locator(`${F} .fmeta`)).toContainText('tokens per question');
  await expect(page.locator(`${F} .ub`)).toHaveCount(1);
  expect(errs).toEqual([]);
});

test('a soon source says Coming soon, and an own source opens the viewer', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'main');
  await expect(page.locator(`${F} .srow`, { hasText: 'Coming soon' })).toHaveCount(1);
  await page.locator(`${F} .srow`, { hasText: 'Pricing survey 2025' }).click();
  expect((await page.evaluate(() => window.__board!.viewer()))?.cardId).toBe('pdf');
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.__board!.focus())).toBe('main');
});

test('an answer row switches the focus to that chat', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'deep');
  await page.locator(`${F} .srow`, { hasText: 'Q1.1 answer' }).click();
  expect(await page.evaluate(() => window.__board!.focus())).toBe('side');
  await expect(page.locator(`${F} .tl .cur`)).toContainText('Q1.1');
});

test('a timeline step opens that question', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'deep');
  await page.locator(`${F} .tl button.st`).last().click();
  expect(await page.evaluate(() => window.__board!.focus())).toBe('second');
});

test('an inherited source can be left out here', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'side');
  await page.locator(`${F} .srow`, { hasText: 'Pricing survey 2025' }).click();
  expect(await page.evaluate(() => (window.__board!.card('side')!.data as { hide?: string[] }).hide)).toContain('pdf');
  await expect(page.locator(`${F} .srow.off`)).toHaveCount(1);
  await page.locator(`${F} .srow`, { hasText: 'Pricing survey 2025' }).click();
  await expect(page.locator(`${F} .srow.off`)).toHaveCount(0);
});

test('leaving out a pile row hides the pile', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'deep');
  await page.locator(`${F} .srow`, { hasText: 'Customer interviews' }).click();
  expect(await page.evaluate(() => (window.__board!.card('deep')!.data as { hide?: string[] }).hide)).toContain('interviews');
  await expect(page.locator(`${F} .srow.off`)).toHaveCount(1);
});

test('a follow-up streams into the focus view', async ({ page }) => {
  await openBoard(page, '?firstTokenMs=100&wordMs=5'); await openFocus(page, 'main');
  await page.locator(`${F} .fcomp textarea`).fill('And annual?'); await page.keyboard.press('Enter');
  await expect(page.locator(`${F} .art`).last()).toContainText('try $12 a month', { timeout: 5000 });
  await expect(page.locator(`${F} .ub`).last()).toHaveText('And annual?');
  await expect(page.locator(`${F} .fcomp textarea`)).toBeEnabled();
});

test('the composer is locked while an answer streams', async ({ page }) => {
  await openBoard(page, '?firstTokenMs=1500&wordMs=5'); await openFocus(page, 'main');
  await page.locator(`${F} .fcomp textarea`).fill('Hold on'); await page.keyboard.press('Enter');
  await expect(page.locator(`${F} .fcomp textarea`)).toBeDisabled();
  await expect(page.locator(`${F} .art .skel`)).toHaveCount(1);
  await expect(page.locator(`${F} .fcomp textarea`)).toBeEnabled({ timeout: 6000 });
});

test('web search shows its results first', async ({ page }) => {
  await openBoard(page, '?firstTokenMs=100&wordMs=5'); await openFocus(page, 'main');
  const web = page.locator(`${F} .fcomp .cp`, { hasText: 'Web' });
  await expect(web).not.toHaveClass(/on/); await web.click(); await expect(web).toHaveClass(/on/);
  await page.locator(`${F} .fcomp textarea`).fill('Compare pricing pages'); await page.keyboard.press('Enter');
  await expect(page.locator(`${F} .wchip`)).toContainText('Pricing pages compared');
  await expect(page.locator(`${F} .art`).last()).toContainText('try $12 a month', { timeout: 5000 });
  await expect(page.locator(`${F} .wchip`)).toHaveCount(1);   // it stays above its answer
  await expect(page.locator(`${F} .wh`)).toContainText('Searched the web for “Compare pricing pages”');
  const chip = page.locator(`${F} a.wchip`);
  await expect(chip).toHaveAttribute('target', '_blank');
  await expect(chip).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.locator(`${F} .art .who`).last()).toContainText('answered with 2 sources · 1 web');
});

test('web chips stay on one line and scroll sideways', async ({ page }) => {
  await openBoard(page, '?firstTokenMs=100&wordMs=5'); await openFocus(page, 'main');
  await page.locator(`${F} .fcomp .cp`, { hasText: 'Web' }).click();
  await page.locator(`${F} .fcomp textarea`).fill('Compare pricing pages'); await page.keyboard.press('Enter');
  await expect(page.locator(`${F} .art.live`)).toHaveCount(0, { timeout: 8000 });
  await page.waitForTimeout(1000);
  await expect(page.locator(`${F} .wchip`)).toHaveCount(1);
  await page.evaluate(() => {
    const sc = document.querySelector('.wscroll')!;
    for (let i = 0; i < 12; i++) { const a = sc.firstElementChild!.cloneNode(true) as HTMLElement; sc.appendChild(a); }
  });
  const m = await page.evaluate(() => {
    const sc = document.querySelector('.wscroll') as HTMLElement;
    const tops = [...sc.children].map((c) => Math.round(c.getBoundingClientRect().top));
    sc.scrollLeft = 200;
    return { oneLine: new Set(tops).size === 1, over: sc.scrollWidth > sc.clientWidth, moved: sc.scrollLeft > 0, h: sc.getBoundingClientRect().height };
  });
  expect(m).toMatchObject({ oneLine: true, over: true, moved: true }); expect(m.over).toBe(true); expect(m.moved).toBe(true); expect(m.h).toBeLessThan(50);
});

test('re-ask a question in a new branch', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'main');
  await page.locator(`${F} .ub`).first().hover();
  await page.getByRole('button', { name: 'Ask again in a new branch' }).click();
  expect(await page.evaluate(() => window.__board!.dialog())).toMatchObject({ mode: 'branch', parentId: 'main' });
  await expect(page.locator('#d-first')).toHaveValue('Using what is on this desk, what should a solo founder charge?');
});

test('re-asking a later question forks from the answer before it', async ({ page }) => {
  await openBoard(page, '?firstTokenMs=50&wordMs=5'); await openFocus(page, 'main');
  await page.locator(`${F} .fcomp textarea`).fill('And annual?'); await page.keyboard.press('Enter');
  await expect(page.locator(`${F} .art`)).toHaveCount(2, { timeout: 5000 });
  await expect(page.locator(`${F} .fcomp textarea`)).toBeEnabled({ timeout: 5000 });
  await page.locator(`${F} .ub`).last().hover();
  await page.getByRole('button', { name: 'Ask again in a new branch' }).last().click();
  await expect(page.locator('#d-first')).toHaveValue('And annual?');
  await page.click('#d-ok');
  const c = await page.evaluate(() => window.__board!.chats().find((x) => x.parentId === 'main' && x.forkedFromMessageId && x.id !== 'side' && x.id !== 'second'));
  expect(c!.forkedFromMessageId).toMatch(/_a$/);
});

test('Branch from here and Settings open the sheet', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'main');
  await page.locator(`${F} [data-b]`).first().click();
  expect(await page.evaluate(() => window.__board!.dialog())).toMatchObject({ mode: 'branch', parentId: 'main' });
  await page.keyboard.press('Escape');
  await page.locator(`${F} .mtop [data-settings]`).click();
  expect(await page.evaluate(() => window.__board!.dialog())).toMatchObject({ mode: 'edit' });
  await page.keyboard.press('Escape');
  // 'main' has started, so its model chip offers a branch on another model instead of settings (lock.spec.ts)
  await page.locator(`${F} .fcomp [data-settings]`).click();   // the model chip
  await expect(page.locator('[data-pb="modelpop"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-pb="modelpop"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.__board!.dialog())).toBeNull();
  expect(await page.evaluate(() => window.__board!.focus())).toBe('main');
});

test('the Source chip asks for files for this desk', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'main');
  await page.evaluate(() => { window.addEventListener('pb:pickfiles', (e) => { window.__pick = (e as CustomEvent).detail; }); });
  await page.locator(`${F} .fcomp .cp`, { hasText: 'Source' }).click();
  expect(await page.evaluate(() => window.__pick)).toEqual({ deskId: 'main' });
});

test('the more menu offers compare only with siblings', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'main');
  await more(page);
  await expect(page.locator(`${F} [data-pb="focusmenu"]`)).toHaveClass(/on/);
  await expect(page.locator(`${F} [data-pb="focusmenu"] button`, { hasText: 'Compare with siblings' })).toHaveCount(0);
  await expect(page.locator(`${F} [data-pb="focusmenu"] button`, { hasText: 'Bring back' })).toHaveCount(0);
  await expect(page.locator(`${F} [data-pb="focusmenu"] button`, { hasText: 'Delete question' })).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator(`${F} [data-pb="focusmenu"]`)).not.toHaveClass(/on/);
  expect(await page.evaluate(() => window.__board!.focus())).toBe('main');   // Escape closed the menu first
});

test('compare keeps one sibling and folds the other', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'side');
  await more(page); await page.getByText('Compare with siblings').click();
  await expect(page.locator('[data-pb="compare"] .cmp-col')).toHaveCount(2);
  await page.locator('[data-pb="compare"] .cmp-col', { hasText: 'What does value-based pricing mean?' }).getByText('Keep this one').click();
  await expect(page.locator('.card[data-id="second"]')).toHaveClass(/demoted/);
  await expect(page.locator('[data-pb="compare"]')).not.toHaveClass(/on/);
  await more(page); await expect(page.locator(`${F} [data-pb="focusmenu"] button`, { hasText: 'Bring back' })).toHaveCount(0);
});

test('a folded chat can be brought back from the focus view', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'side');
  await more(page); await page.getByText('Compare with siblings').click();
  await page.locator('[data-pb="compare"] .cmp-col', { hasText: 'Second opinion with real customers' }).getByText('Keep this one').click();
  await expect(page.locator('.card[data-id="side"]')).toHaveClass(/demoted/);
  await more(page); await page.getByText('Bring back').click();
  await expect(page.locator('.card[data-id="side"]')).not.toHaveClass(/demoted/);
});

test('compare closes on Escape and returns focus to the more button', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'side');
  await more(page); await page.getByText('Compare with siblings').click();
  await expect(page.locator('[data-pb="compare"]')).toHaveClass(/on/);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-pb="compare"]')).not.toHaveClass(/on/);
  await expect(page.locator('[data-pb="compare"]')).toHaveJSProperty('inert', true);
  await expect(page.locator(`${F} [data-act="more"]`)).toBeFocused();
  expect(await page.evaluate(() => window.__board!.focus())).toBe('side');
});

test('compare columns scroll together', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'side');
  await more(page); await page.getByText('Compare with siblings').click();
  const cols = page.locator('[data-pb="compare"] .cmp-body');
  for (const i of [0, 1]) await cols.nth(i).evaluate((el) => { const k = document.createElement('div'); k.style.height = '3000px'; el.appendChild(k); });
  await cols.first().evaluate((el) => { el.scrollTop = 400; });
  await expect.poll(() => cols.nth(1).evaluate((el) => el.scrollTop)).toBeGreaterThan(100);
});

test('Back and Escape return to the board', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'main');
  await expect(page.locator(F)).toHaveJSProperty('inert', false);
  await page.keyboard.press('Escape'); await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.__board!.focus())).toBeNull();
  await expect(page.locator(F)).toHaveJSProperty('inert', true); await expect(page.locator(F)).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator(F)).toHaveCSS('display', 'none');
  await expect(page.locator('.card[data-id="main"]')).toHaveCSS('opacity', '1');
  await openFocus(page, 'main'); await page.getByRole('button', { name: /Board/ }).click(); await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.__board!.focus())).toBeNull();
});

test('the board behind is inert while the focus view is open', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'main');
  await expect(page.locator('.pb-vp')).toHaveJSProperty('inert', true);
  await page.keyboard.press('Escape'); await page.waitForTimeout(800);
  await expect(page.locator('.pb-vp')).toHaveJSProperty('inert', false);
});

test('focus returns to the card button that opened it', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.fit(false)); await page.waitForTimeout(250);
  await page.locator('[data-id="main"]').hover(); await page.locator('[data-id="main"] [data-act="open"]').focus();
  await page.keyboard.press('Enter'); await page.waitForTimeout(700);
  expect(await page.evaluate(() => window.__board!.focus())).toBe('main');
  await page.keyboard.press('Escape'); await page.waitForTimeout(800);
  await expect(page.locator('[data-id="main"] [data-act="open"]')).toBeFocused();
});

test('re-asking the first question starts a fresh branch that still inherits the desk', async ({ page }) => {
  await openBoard(page, '?firstTokenMs=50&wordMs=5'); await openFocus(page, 'main');
  const before = await page.evaluate(() => window.__board!.chats().length);
  await page.locator(`${F} .ub`).first().hover();
  await page.getByRole('button', { name: 'Ask again in a new branch' }).first().click();
  await expect(page.locator('#d-first')).toHaveValue('Using what is on this desk, what should a solo founder charge?');
  await page.click('#d-ok');
  await expect.poll(() => page.evaluate(() => window.__board!.chats().length)).toBe(before + 1);
  const c = await page.evaluate(() => window.__board!.chats().find((x) => x.parentId === 'main' && x.id !== 'side' && x.id !== 'second')!);
  expect(c.data).toMatchObject({ carry: 'fresh', inheritDesk: true });
  expect(c.forkedFromMessageId).toBeNull();
  await expect.poll(async () => (await page.evaluate((id) => window.__board!.card(id)!.messageCount, c.id)) ?? 0, { timeout: 6000 }).toBeGreaterThan(0);
});

test('the compare sheet makes the focus view inert', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'side');
  await more(page); await page.getByText('Compare with siblings').click();
  await expect(page.locator(F)).toHaveJSProperty('inert', true);
  await page.keyboard.press('Escape');
  await expect(page.locator(F)).toHaveJSProperty('inert', false);
});

test('a pile counts as one source: the card face and the focus view agree for Q1.2', async ({ page }) => {
  await openBoard(page);
  // second reads web + the 4-file pile on its desk (2 own) and pdf + note from above (2; the soon video is not read)
  const foot = (await page.locator('[data-id="second"] .cfoot').innerText()).replace(/\s+/g, ' ');
  expect(foot).toContain('2 sources · 2 from above');
  const face = Number(/(\d+) source/.exec(foot)![1]) + Number(/(\d+) from above/.exec(foot)![1]);
  await openFocus(page, 'second');
  await expect(page.locator(`${F} .ph .cnt`).first()).toHaveText(String(face));
  await expect(page.locator(`${F} .fmeta`)).toContainText(`${face} sources`);
});

test('an answer carries no fake citations: no .cited note and no quote block', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'main');
  await expect(page.locator(`${F} .art`).first()).toContainText('answered with');
  await expect(page.locator(`${F} .cited`)).toHaveCount(0);
  await expect(page.locator(`${F} .quote`)).toHaveCount(0);
});

test('the answer fade stays above the composer however tall it grows', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'main');
  const ta = page.locator(`${F} .fcomp textarea`);
  const fade = page.locator(`${F} .mfade`);
  const gap = async () => page.evaluate((sel) => {
    const f = document.querySelector(`${sel} .mfade`)!.getBoundingClientRect();
    const b = document.querySelector(`${sel} .fcomp .box`)!.getBoundingClientRect();
    return b.top - f.bottom;   // >= 0: the fade ends at or above the composer's top edge
  }, F);
  await expect(fade).toHaveCount(1);
  expect(await gap()).toBeGreaterThanOrEqual(-0.5);
  await ta.fill('first line\nsecond\nthird\nfourth');
  await page.waitForTimeout(100);
  expect(await gap()).toBeGreaterThanOrEqual(-0.5);
  const hit = await page.evaluate((sel) => {
    const t = document.querySelector(`${sel} .fcomp textarea`) as HTMLTextAreaElement;
    const r = t.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + 20, r.top + 8);
    const f = document.querySelector(`${sel} .mfade`)!.getBoundingClientRect();
    return { onTa: el === t, fadeBottom: f.bottom, taTop: r.top };
  }, F);
  expect(hit.onTa).toBe(true);
  expect(hit.fadeBottom).toBeLessThanOrEqual(hit.taTop);
});

test('reply actions show on hover or focus-within only', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'main');
  const art = page.locator(`${F} .art`).first();
  const copy = art.locator('[data-copy]'), branch = art.locator('[data-b]');
  const op = (l: typeof copy) => l.evaluate((el) => Number(getComputedStyle(el).opacity));
  await page.mouse.move(2, 2);
  await expect.poll(() => op(copy), { timeout: 3000 }).toBe(0); await expect.poll(() => op(branch), { timeout: 3000 }).toBe(0);
  const box0 = await copy.boundingBox();
  await art.locator('.body').hover();
  await expect.poll(() => op(copy), { timeout: 3000 }).toBe(1); await expect.poll(() => op(branch), { timeout: 3000 }).toBe(1);
  expect(await copy.boundingBox()).toEqual(box0);   // no layout jump
  await page.mouse.move(2, 2);
  await expect.poll(() => op(copy), { timeout: 3000 }).toBe(0);
  await copy.focus();
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');   // reach it by keyboard
  await expect.poll(() => op(copy), { timeout: 3000 }).toBe(1);
  const dur = await copy.evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(dur.split(',').every((d) => parseFloat(d) <= 0.15)).toBe(true);
});

test('on the board card the web results collapse to one chip', async ({ page }) => {
  await openBoard(page, '?firstTokenMs=100&wordMs=150'); await openFocus(page, 'main');
  await page.locator(`${F} .fcomp .cp`, { hasText: 'Web' }).click();
  await page.locator(`${F} .fcomp textarea`).fill('Compare pricing pages'); await page.keyboard.press('Enter');
  await expect(page.locator(`${F} .wchip`)).toHaveCount(1);
  await page.keyboard.press('Escape');
  const chip = page.locator('[data-id="main"] .webline .wchip.count');
  await expect(chip).toHaveText('1 web result');
  expect(await page.locator('[data-id="main"] .webline a').count()).toBe(0);
});
