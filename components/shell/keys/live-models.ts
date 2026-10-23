'use client';
import { useEffect, useState } from 'react';
import type { LiveModels } from '@/components/board/lib/catalog';
import { PROVIDERS, hasWorkingKey } from './providers';
import type { KeyStatusMap } from './status-types';

/**
 * Every chat model each working key offers, listed by the provider (GET /api/user-api-keys/models).
 * Fetched again when the set of working keys changes or a key is saved; empty until it arrives, and on failure.
 */
export function useLiveModels(statuses: KeyStatusMap | null, savedAt?: number): LiveModels {
  const [models, setModels] = useState<LiveModels>({});
  const working = PROVIDERS.filter((p) => hasWorkingKey(statuses, p.id)).map((p) => p.id).join(',');
  useEffect(() => {
    if (!working) { setModels({}); return; }
    let live = true;
    fetch('/api/user-api-keys/models', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((b: { models?: LiveModels } | null) => { if (live && b?.models) setModels(b.models); })
      .catch(() => { /* the picker keeps the catalog models */ });
    return () => { live = false; };
  }, [working, savedAt]);
  return models;
}
