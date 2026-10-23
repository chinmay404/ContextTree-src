'use client';
import './branch-sheet.css';
import type { ReactElement } from 'react';
import { MAIN_MODELS, MODELS, PROVIDER_NAME, liveProvider, modelInfo, type LiveModels, type ModelKey } from '../lib/catalog';
import type { ProviderId } from '../api/types';
import { ModelMark } from './ModelMark';

const MORE = (Object.keys(MODELS) as ModelKey[]).filter((k) => !MAIN_MODELS.includes(k));

/**
 * The one model picker: the three main models as pills, the rest under "More models", followed by every chat model
 * each working key offers (`live`, listed from the provider). `value` and `onChange` carry engine ids. A locked model
 * (no key for it) reports through `onLockedClick` instead of changing.
 */
export function ModelPicker(p: {
  value: string;
  onChange: (engineId: string) => void;
  isLocked?: (engineId: string) => boolean;
  /** Shown as a settled value: nothing can be picked. */
  disabled?: boolean;
  onLockedClick?: (engineId: string) => void;
  live?: LiveModels;
}): ReactElement {
  const known = modelInfo(p.value);
  const groups = (Object.keys(p.live ?? {}) as ProviderId[]).filter((g) => p.live?.[g]?.length);
  const isLive = liveProvider(p.value) !== null;
  const inMore = (known.key !== null && MORE.includes(known.key)) || isLive;
  // a live id no longer offered (or not loaded yet) still shows as the current choice
  const listed = isLive && groups.some((g) => p.live?.[g]?.some((m) => m.id === p.value));
  const pick = (engineId: string): void => {
    if (p.isLocked?.(engineId)) { p.onLockedClick?.(engineId); return; }
    p.onChange(engineId);
  };
  const pill = (key: string, engineId: string, m: { key: ModelKey | null; name: string; color: string }): ReactElement => {
    const locked = !!p.isLocked?.(engineId);
    return (
      <button key={key} type="button" className={`pp${p.value === engineId ? ' on' : ''}${locked ? ' locked' : ''}`} data-model={key}
        aria-pressed={p.value === engineId} disabled={p.disabled} data-locked={locked ? 'true' : undefined} onClick={() => pick(engineId)}>
        <ModelMark model={m} />{m.name}
      </button>
    );
  };
  return (
    <div className="pills">
      {MAIN_MODELS.map((k) => pill(k, MODELS[k].engineId, { key: k, name: MODELS[k].name, color: MODELS[k].color }))}
      {known.key === null && p.value && !isLive ? pill('current', p.value, known) : null}
      <span className={`pp${inMore ? ' on' : ''}`}>
        <select id="d-more" aria-label="More models" disabled={p.disabled} value={inMore ? p.value : ''}
          onChange={(e) => { if (e.target.value) pick(e.target.value); }}>
          <option value="">More models</option>
          {MORE.map((k) => <option key={k} value={MODELS[k].engineId}>{MODELS[k].name}</option>)}
          {isLive && !listed ? <option value={p.value}>{known.name}</option> : null}
          {groups.map((g) => (
            <optgroup key={g} label={`All ${PROVIDER_NAME[g]} models`}>
              {p.live![g]!.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </optgroup>
          ))}
        </select>
      </span>
    </div>
  );
}
