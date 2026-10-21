'use client';
import './branch-sheet.css';
import type { ReactElement } from 'react';
import { MAIN_MODELS, MODELS, modelInfo, type ModelKey } from '../lib/catalog';
import { ModelMark } from './ModelMark';

const MORE = (Object.keys(MODELS) as ModelKey[]).filter((k) => !MAIN_MODELS.includes(k));

/**
 * The one model picker: the three main models as pills, the rest under "More models".
 * `value` and `onChange` carry engine ids. A locked model (no key for it) reports through `onLockedClick` instead of changing.
 */
export function ModelPicker(p: {
  value: string;
  onChange: (engineId: string) => void;
  isLocked?: (engineId: string) => boolean;
  onLockedClick?: (engineId: string) => void;
}): ReactElement {
  const known = modelInfo(p.value);
  const inMore = known.key !== null && MORE.includes(known.key);
  const pick = (engineId: string): void => {
    if (p.isLocked?.(engineId)) { p.onLockedClick?.(engineId); return; }
    p.onChange(engineId);
  };
  const pill = (key: string, engineId: string, m: { key: ModelKey | null; name: string; color: string }): ReactElement => {
    const locked = !!p.isLocked?.(engineId);
    return (
      <button key={key} type="button" className={`pp${p.value === engineId ? ' on' : ''}${locked ? ' locked' : ''}`} data-model={key}
        aria-pressed={p.value === engineId} data-locked={locked ? 'true' : undefined} onClick={() => pick(engineId)}>
        <ModelMark model={m} />{m.name}
      </button>
    );
  };
  return (
    <div className="pills">
      {MAIN_MODELS.map((k) => pill(k, MODELS[k].engineId, { key: k, name: MODELS[k].name, color: MODELS[k].color }))}
      {known.key === null && p.value ? pill('current', p.value, known) : null}
      <span className={`pp${inMore ? ' on' : ''}`}>
        <select id="d-more" aria-label="More models" value={inMore ? p.value : ''}
          onChange={(e) => { if (e.target.value) pick(e.target.value); }}>
          <option value="">More models</option>
          {MORE.map((k) => <option key={k} value={MODELS[k].engineId}>{MODELS[k].name}</option>)}
        </select>
      </span>
    </div>
  );
}
