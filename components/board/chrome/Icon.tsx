import { memo, type CSSProperties, type ReactElement } from 'react';
import { iconSvg } from '../engine/icons';

/** A lucide icon for React chrome, same markup as engine/icons.ts `icon()`; safe to render on the server. */
/** Memoised: a parent that re-renders between a press and its release must not rebuild the glyph under the pointer (the click would be lost). */
export const Icon = memo(function Icon({ name, color, size, className }: { name: string; color?: string; size?: number; className?: string }): ReactElement {
  const style = { ...(color ? { '--c': color } : {}), ...(size ? { '--s': `${size}px` } : {}) } as CSSProperties;
  return <span className={className ? `i ${className}` : 'i'} style={style} aria-hidden="true" dangerouslySetInnerHTML={{ __html: iconSvg(name) }} />;
});
