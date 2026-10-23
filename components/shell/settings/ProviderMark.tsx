import type { ReactElement } from 'react';
import { PROVIDER_ICON_PATHS } from '@/components/board/lib/provider-icons';
import type { ProviderId } from '../keys/status-types';

/** A provider's mark (decorative: the name is always written next to it), in currentColor. */
export function ProviderMark({ id, size = 22 }: { id: ProviderId; size?: number }): ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" aria-hidden="true" focusable="false" style={{ flex: 'none', display: 'block' }}>
      {PROVIDER_ICON_PATHS[id].map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}
