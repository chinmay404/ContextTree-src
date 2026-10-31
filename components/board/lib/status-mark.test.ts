import { DONE_MS, SPIN_MS, statusMark } from './status-mark';

describe('statusMark', () => {
  it('draws the ring and an arc while reading, on the spin clock so a re-render does not restart it', () => {
    const h = statusMark('reading', SPIN_MS + 250);
    expect(h).toContain('data-state="reading"');
    expect(h).toContain('class="sm-ring"');
    expect(h).toContain('class="sm-arc"');
    expect(h).toContain('--sm-at:-250ms');
    expect(h).not.toContain('sm-glyph');
  });
  it('draws a check when done and an exclamation when it failed', () => {
    expect(statusMark('done', 0)).toMatch(/data-state="done".*sm-glyph/);
    expect(statusMark('failed', 0)).toMatch(/data-state="failed".*sm-glyph/);
    expect(statusMark('done', 0)).not.toBe(statusMark('failed', 0).replace('failed', 'done'));
  });
  it('done keeps its place in the draw across a re-render', () => {
    expect(statusMark('done', 300)).toContain('--sm-at:-300ms');
    expect(statusMark('done', DONE_MS + 999)).toContain(`--sm-at:-${DONE_MS}ms`);
  });
  it('is decorative: the card says the same thing in words', () => {
    expect(statusMark('reading', 0)).toContain('aria-hidden="true"');
  });
});
