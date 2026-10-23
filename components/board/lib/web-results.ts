/** Web search hits as one compact row of chips (focus view) or one "N web results" chip (board card). */
import { esc } from './format';
import { icon } from '../engine/icons';

export type WebHit = { title?: string; url?: string };
export interface WebChip { title: string; site: string; href: string | null }

export const safeUrl = (u?: string): string | null => (u && /^https?:\/\//i.test(u) ? u : null);
const hostOf = (u?: string): string => { try { return u ? new URL(u).host : ''; } catch { return ''; } };

export function webChips(list: readonly WebHit[]): WebChip[] {
  return list.map((w) => {
    const site = hostOf(w.url);
    return { title: w.title || site || 'Web result', site, href: safeUrl(w.url) };
  });
}

export const webHeader = (query?: string | null): string => {
  const q = query?.trim();
  return q ? `Searched the web for “${q}”` : 'Web results';
};
export const webCountLabel = (n: number): string => `${n} web result${n === 1 ? '' : 's'}`;
/** "2 sources · 3 web": web hits count as sources too. */
export const sourcesPhrase = (n: number, web: number): string =>
  `${n} source${n === 1 ? '' : 's'}${web > 0 ? ` · ${web} web` : ''}`;

/** innerHTML for a chat card (collapsed) or any HTML host (expanded); every value is escaped. */
export function webRowHTML(list: readonly WebHit[], query: string | null | undefined, collapsed: boolean): string {
  if (!list.length) return '';
  if (collapsed) return `<div class="webline"><span class="wchip count" title="${esc(webHeader(query))}">${icon('globe')}${esc(webCountLabel(list.length))}</span></div>`;
  const chips = webChips(list).map((c) => {
    const inner = `${icon('globe')}<span class="wt">${esc(c.title)}</span>${c.site && c.site !== c.title ? `<span class="ws">${esc(c.site)}</span>` : ''}`;
    return c.href
      ? `<a class="wchip" href="${esc(c.href)}" target="_blank" rel="noopener noreferrer" title="${esc(c.title)}">${inner}</a>`
      : `<span class="wchip" title="${esc(c.title)}">${inner}</span>`;
  }).join('');
  return `<div class="webline"><div class="wh">${esc(webHeader(query))}</div><div class="wscroll">${chips}</div></div>`;
}
