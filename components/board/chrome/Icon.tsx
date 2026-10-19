import type { CSSProperties, ReactElement } from 'react';
import { iconSvg } from '../engine/icons';

/** A lucide icon for React chrome, same markup as engine/icons.ts `icon()`; safe to render on the server. */
export function Icon({ name, color, size, className }: { name: string; color?: string; size?: number; className?: string }): ReactElement {
  const style = { ...(color ? { '--c': color } : {}), ...(size ? { '--s': `${size}px` } : {}) } as CSSProperties;
  return <span className={className ? `i ${className}` : 'i'} style={style} aria-hidden="true" dangerouslySetInnerHTML={{ __html: iconSvg(name) }} />;
}
