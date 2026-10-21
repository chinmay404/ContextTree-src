import type { Metadata } from 'next';

const TITLE = 'Context Tree — give every question its own desk';
const DESCRIPTION =
  "Pin PDFs, links and notes beside a question. Its chat reads what's on that desk. Branch to ask it another way. Free in your browser with your own API keys.";

/** SEO for the V3 landing. No images until the owner supplies one (switch checklist item 2). */
export const V3_METADATA: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/', siteName: 'Context Tree', type: 'website', images: [] },
  twitter: { card: 'summary', title: TITLE, description: DESCRIPTION },
};

export const isV3 = (): boolean => process.env.NEXT_PUBLIC_BOARD_V3 === '1';
