import type { MetadataRoute } from 'next';

/** What an installed Context Tree is: opens on the boards page, with no browser bar. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Context Tree',
    short_name: 'Context Tree',
    description: 'A thinking board for branching AI conversations.',
    id: '/boards',
    start_url: '/boards',
    scope: '/',
    display: 'standalone',
    background_color: '#F5F5F7',
    theme_color: '#F5F5F7',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
