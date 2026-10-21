'use client';
import type { CSSProperties, ReactElement } from 'react';
import type { ModelKey } from '../lib/catalog';
import { MODEL_ICON_PATHS } from '../lib/model-icons';

/** The model's mark in its colour (currentColor), or the old dot for an engine id the catalog does not know. */
export function ModelMark(p: { model: { key: ModelKey | null; name: string; color: string } }): ReactElement {
  const { key, name, color } = p.model;
  const style = { '--c': color } as CSSProperties;
  if (!key) return <span className="mdot" style={style} />;
  return (
    <svg className="mmark" viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" role="img" aria-label={name} focusable="false" style={style}>
      {MODEL_ICON_PATHS[key].map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}
