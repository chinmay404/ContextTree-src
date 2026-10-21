'use client';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Lock, Plus } from 'lucide-react';
import { MODELS } from '@/components/board/lib/catalog';
import { KeyError } from '../keys/key-store';
import { PROVIDERS, keyStatusLine, type ProviderInfo } from '../keys/providers';
import type { KeyStatus, ProviderId } from '../keys/status-types';
import type { UseKeyStatus } from '../keys/use-key-status';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = (iso: string | null): string => {
  const d = iso ? new Date(iso) : null;
  return d && Number.isFinite(d.getTime()) ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : 'recently';
};

type Mode = 'idle' | 'add' | 'remove';

/** "Make one at <link> — it takes about a minute. We check it with {Name} before saving." */
function helpLine(info: ProviderInfo): ReactElement {
  const m = /^Make one at (\S+)(.*)$/.exec(info.keyHelp);
  if (!m) return <>{info.keyHelp}</>;
  return <>Make one at <a href={info.keyUrl} target="_blank" rel="noopener noreferrer">{m[1]}</a>{m[2]}</>;
}

function Row({ info, status, keys, autoOpen, focusRef, onSaved }: {
  info: ProviderInfo;
  status: KeyStatus;
  keys: UseKeyStatus;
  autoOpen: boolean;
  focusRef: boolean;
  onSaved(p: ProviderId): void;
}): ReactElement {
  const [mode, setMode] = useState<Mode>(autoOpen ? 'add' : 'idle');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const actRef = useRef<HTMLButtonElement>(null);

  const rejected = status.configured && status.status === 'rejected';
  const uncheckedNote = status.configured && status.status === 'unchecked';
  const first = MODELS[info.models[0]];
  const working = status.configured && status.status !== 'rejected';

  useEffect(() => {
    if (mode === 'add') inputRef.current?.focus();
  }, [mode]);
  useEffect(() => {
    if (focusRef && !autoOpen) actRef.current?.focus();
  }, [focusRef, autoOpen]);

  const save = async () => {
    const key = value.trim();
    if (!key || busy) return;
    setBusy(true);
    setError(null);
    try {
      await keys.save(info.id, key);
      setValue('');
      setMode('idle');
      onSaved(info.id);
    } catch (e) {
      setError(e instanceof KeyError ? e.message : "Couldn't reach Context Tree. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try { await keys.remove(info.id); setMode('idle'); setError(null); }
    catch (e) { setError(e instanceof KeyError ? e.message : "Couldn't remove it. Try again."); }
    finally { setBusy(false); }
  };

  const stateChip = !status.configured ? (
    <span className="ks none">Not set</span>
  ) : rejected ? (
    <span className="ks bad">Key rejected</span>
  ) : (
    <span className="ks ok">Saved <code>•••• {status.last4 ?? ''}</code></span>
  );

  const cancel = () => { setMode('idle'); setValue(''); setError(null); };

  return (
    <div className={`prow${rejected ? ' bad' : ''}${mode === 'add' ? ' open' : ''}`} style={{ ['--pc' as string]: info.color }} data-provider={info.id}>
      <div className="pt" aria-hidden="true">{info.letter}</div>
      <div className="pbody">
        <div className="pn">{info.name} {stateChip}</div>
        {uncheckedNote && <div className="why">Saved · couldn&apos;t check it just now</div>}
        <div className="ms">
          {info.models.map((k) => (
            <span key={k} className={working ? '' : 'lk'}>{!working && <Lock size={10} strokeWidth={2} />}{MODELS[k].name}</span>
          ))}
        </div>
        {rejected && (
          <div className="why">
            {info.name} turned this key down on {shortDate(status.checkedAt)}. It may have been revoked or run out of credit. Replace it to use {first.name} again.{' '}
            <button type="button" className="linkb" onClick={() => void keys.check(true)}>Check again</button>
          </div>
        )}
        {mode === 'remove' && (
          <div className="why confirm" role="group" aria-label={`Remove ${info.name} key`}>
            Remove your {info.name} key? {first.name} stops working until you add one.
            <span className="acts">
              <button type="button" className="btn sm danger" disabled={busy} onClick={() => void remove()}>Remove</button>
              <button type="button" className="btn sm ghost" onClick={cancel}>Cancel</button>
            </span>
          </div>
        )}
      </div>
      {mode === 'idle' && (
        <div className="acts">
          {status.configured ? (
            <>
              <button ref={actRef} type="button" className="btn sm white" onClick={() => setMode('add')}>Replace</button>
              <button type="button" className="btn sm ghost" onClick={() => setMode('remove')}>Remove</button>
            </>
          ) : (
            <button ref={actRef} type="button" className="btn sm primary" onClick={() => setMode('add')}><Plus size={14} strokeWidth={2} />Add key</button>
          )}
        </div>
      )}
      {mode === 'add' && (
        <>
          <form className="addf" onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <input
              ref={inputRef}
              className="fi"
              type="password"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label={`${info.name} API key`}
              placeholder="Paste your key"
              value={value}
              disabled={busy}
              onChange={(e) => { setValue(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === 'Escape' && !busy) { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); cancel(); } }}
            />
            <button type="submit" className="btn primary" disabled={busy || !value.trim()}>{busy ? `Checking with ${info.name}…` : 'Save key'}</button>
            <button type="button" className="btn ghost" disabled={busy} onClick={cancel}>Cancel</button>
          </form>
          {error && <div className="kerr" role="alert">{error}</div>}
          <div className="help">{helpLine(info)}</div>
        </>
      )}
      {mode === 'add' && <span className="sr-only" aria-live="polite">{busy ? `Checking with ${info.name}…` : ''}</span>}
    </div>
  );
}

export function KeysPanel({ keys, focusProvider, onSaved }: {
  keys: UseKeyStatus;
  focusProvider?: ProviderId;
  onSaved(p: ProviderId): void;
}): ReactElement {
  const line = keyStatusLine(keys.statuses);
  return (
    <section className="kmain" aria-labelledby="keys-h">
      <div className="khead">
        <div>
          <h2 id="keys-h">API keys</h2>
          <p>Your boards run on your own keys. You pay each provider directly; we add nothing on top.</p>
        </div>
        <span className="cnt"><i className={line.tone} />{line.text}</span>
      </div>
      <div className="prows">
        {PROVIDERS.map((info) => {
          const status = keys.statuses?.[info.id] ?? { provider: info.id, configured: false, last4: null, status: null, checkedAt: null, updatedAt: null };
          const isTarget = focusProvider === info.id;
          return (
            <Row
              key={info.id}
              info={info}
              status={status}
              keys={keys}
              autoOpen={isTarget && !status.configured}
              focusRef={isTarget}
              onSaved={onSaved}
            />
          );
        })}
      </div>
    </section>
  );
}
