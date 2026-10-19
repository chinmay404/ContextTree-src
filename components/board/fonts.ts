import { Bricolage_Grotesque } from 'next/font/google';

/** Pebble's typeface. Only Board.tsx imports this; pebble.css reads the `--pb-font` variable. */
export const bricolage = Bricolage_Grotesque({ subsets: ['latin'], axes: ['opsz'], variable: '--pb-font', display: 'swap' });
