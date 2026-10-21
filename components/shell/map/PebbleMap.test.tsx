import { renderToStaticMarkup } from 'react-dom/server';
import { PebbleMap } from './PebbleMap';
import type { BoardPreview } from './preview-types';

const preview: BoardPreview = {
  cards: [
    { id: 'c', kind: 'chat', sourceType: null, x: 400, y: 0, deskId: null, pileId: null, parentId: null, name: 'Price it' },
    { id: 's', kind: 'source', sourceType: 'pdf', x: 100, y: 0, deskId: 'c', pileId: null, parentId: null },
  ],
  edges: [],
};

describe('PebbleMap', () => {
  it('is an img with an aria-label naming the board', () => {
    const html = renderToStaticMarkup(<PebbleMap preview={preview} title="Pricing study" />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Map of Pricing study"');
    expect(html).toContain('preserveAspectRatio="xMidYMid meet"');
  });

  it('escapes a hostile title and chat name', () => {
    const bad = '<img src=x onerror=alert(1)>';
    const p: BoardPreview = { ...preview, cards: [{ ...preview.cards[0], name: bad }, preview.cards[1]] };
    const html = renderToStaticMarkup(<PebbleMap preview={p} title={bad} labels />);
    expect(html).toContain('&lt;img');
    expect(html).not.toContain('<img');
  });

  it('labels adds one text per desk', () => {
    const none = renderToStaticMarkup(<PebbleMap preview={preview} title="T" />);
    const withLabels = renderToStaticMarkup(<PebbleMap preview={preview} title="T" labels />);
    expect((none.match(/<text/g) ?? []).length).toBe(0);
    expect((withLabels.match(/<text/g) ?? []).length).toBe(1);
  });

  it('draws a placeholder desk when the preview is missing', () => {
    const html = renderToStaticMarkup(<PebbleMap title="Untitled board" labels />);
    expect(html).toContain('Untitled board');
    expect(html).toContain('<rect');
  });
});
