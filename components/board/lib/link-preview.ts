import type { LinkPreview } from '../api/types';

/** What the paste box was given: one or more links, or plain text. */
export type Pasted = { kind: 'empty' } | { kind: 'links'; urls: string[] } | { kind: 'text'; text: string };

const MAX_LINKS = 8;
const BARE = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d+)?(?:[/?#]\S*)?$/i;

/** `https://…` as typed, a bare `example.com/page` given https, or null when the token is not a link. */
export function normalizeUrl(token: string): string | null {
  const t = token.trim();
  if (!t || /\s/.test(t)) return null;
  const candidate = /^https?:\/\//i.test(t) ? t : BARE.test(t) ? `https://${t}` : null;
  if (!candidate) return null;
  try { const u = new URL(candidate); return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null; } catch { return null; }
}

/** Every whitespace-separated token a link, one to eight of them: a list of links. Anything else is text. */
export function parsePasted(raw: string): Pasted {
  const text = raw.trim();
  if (!text) return { kind: 'empty' };
  const urls: string[] = [];
  for (const tok of text.split(/\s+/)) {
    const u = normalizeUrl(tok);
    if (!u) return { kind: 'text', text };
    if (!urls.includes(u)) urls.push(u);
  }
  return urls.length <= MAX_LINKS ? { kind: 'links', urls } : { kind: 'text', text };
}

export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url), h = u.hostname.toLowerCase();
    if (h === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
    if (h === 'youtube.com' || h.endsWith('.youtube.com')) {
      if (u.pathname === '/watch') return u.searchParams.get('v');
      const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/);
      return m ? m[1] : null;
    }
  } catch { /* not a URL */ }
  return null;
}

/** The preview the board can make from the address alone (no network): used until, or instead of, the engine's. */
export function urlOnlyPreview(url: string): LinkPreview {
  let host = url, path = '';
  try { const u = new URL(url); host = u.hostname.replace(/^www\./, ''); path = u.pathname === '/' ? '' : u.pathname; } catch { /* keep the raw text */ }
  const yt = youtubeId(url);
  return {
    url, kind: yt || /(^|\.)youtube\.com$/.test(host) || host === 'youtu.be' ? 'video' : 'web',
    title: yt ? 'YouTube video' : `${host}${path}`.slice(0, 80), site: host, description: null,
    image: yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : null,
  };
}
