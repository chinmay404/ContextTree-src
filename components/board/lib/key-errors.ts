import type { ProviderId, StreamErrorCode } from '../api/types';
import { PROVIDER_NAME } from './catalog';

export interface KeyErrorView {
  text: string;
  /** What the button does; null when there is none (or the shell gave no way to open the keys sheet). */
  action: 'addkey' | 'fixkey' | null;
  button?: string;
  provider?: ProviderId;
}

/** The words and button for a coded stream error, or null for a plain error (its own message shows). */
export function keyErrorView(
  e: { code?: StreamErrorCode; provider?: ProviderId },
  model: { name: string },
  canOpenSettings: boolean,
): KeyErrorView | null {
  switch (e.code) {
    case 'missing_key':
      if (!e.provider) return null;
      return canOpenSettings
        ? { text: `Add your ${PROVIDER_NAME[e.provider]} key to get an answer from ${model.name}.`, action: 'addkey', button: 'Add key', provider: e.provider }
        : { text: `Add your ${PROVIDER_NAME[e.provider]} key to get an answer from ${model.name}.`, action: null };
    case 'key_rejected':
      if (!e.provider) return null;
      return canOpenSettings
        ? { text: `${PROVIDER_NAME[e.provider]} turned this key down.`, action: 'fixkey', button: 'Fix key', provider: e.provider }
        : { text: `${PROVIDER_NAME[e.provider]} turned this key down.`, action: null };
    case 'unsupported_model':
      return { text: "This model isn't available any more. Branch to pick another.", action: null };
    case 'key_store_unavailable':
      return { text: "Your keys can't be read right now. Try again in a minute.", action: null };
    default:
      return null;
  }
}
