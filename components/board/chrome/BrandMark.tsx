import type { ReactElement } from 'react';

/** The Context Tree mark (public/tree-icon.svg inlined): three rounded boxes joined like a tree. currentColor, decorative. */
export function BrandMark({ size = 20 }: { size?: number }): ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false" style={{ flex: 'none', display: 'block' }}>
      <rect x="35" y="10" width="30" height="20" rx="4" fill="none" stroke="currentColor" strokeWidth="7" />
      <path d="M50 30 L50 45 M35 55 L50 45 L65 55" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <rect x="15" y="65" width="25" height="20" rx="4" fill="none" stroke="currentColor" strokeWidth="7" />
      <rect x="60" y="65" width="25" height="20" rx="4" fill="none" stroke="currentColor" strokeWidth="7" />
    </svg>
  );
}
