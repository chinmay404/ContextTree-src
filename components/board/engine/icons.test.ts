// @vitest-environment jsdom
import { icon, ICON_NAMES } from './icons';

const USED = ['play', 'audio-lines', 'file-text', 'file-pen-line', 'sticky-note', 'globe', 'sheet', 'image', 'layers', 'message-circle', 'git-fork', 'plus', 'minus', 'maximize', 'link', 'maximize-2', 'chevrons-down-up', 'chevrons-up-down', 'ungroup', 'x', 'triangle-alert', 'unlink', 'git-branch', 'arrow-up', 'sliders-horizontal', 'chevron-down', 'arrow-left', 'copy', 'upload', 'more-horizontal', 'globe-lock', 'trash-2', 'rotate-ccw', 'square-dashed', 'spline', 'arrow-right', 'book-open', 'corner-left-up', 'mouse', 'sparkles'];

describe('icon', () => {
  it('returns an svg in a sized span', () => {
    const h = icon('play', '#fff', 18);
    expect(h).toContain('<svg');
    expect(h).toContain('--s:18px');
    expect(h).toContain('--c:#fff');
    expect(h.startsWith('<span class="i"')).toBe(true);
  });
  it('omits unset colour and size', () => {
    expect(icon('plus')).not.toContain('--c:');
  });
  it('renders every name the board uses', () => {
    expect(ICON_NAMES.sort()).toEqual([...USED].sort());
    for (const n of USED) expect(icon(n), n).toContain('<svg');
  });
  it('caches per name', () => {
    expect(icon('copy')).toBe(icon('copy'));
  });
  it('throws on unknown names', () => {
    expect(() => icon('nope')).toThrow();
  });
});
