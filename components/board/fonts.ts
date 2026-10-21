import { Inter } from 'next/font/google';

/** Pebble's typeface (Inter, self-hosted at build). Only Board.tsx imports this; pebble.css reads the `--pb-font` variable. */
export const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--pb-font', display: 'swap' });
