'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutGrid, List, Plus, Search } from 'lucide-react';
import { inter } from '@/components/board/fonts';
import { BrandMark } from '@/components/board/chrome/BrandMark';
import { newId } from '@/components/board/api/ids';
import { ApiError, type EngineApi } from '@/components/board/api/types';
import { AccountPill } from '../account/AccountPill';
import { PROVIDERS, preferredModel } from '../keys/providers';
import type { ProviderId } from '../keys/status-types';
import { FirstQuestion } from './FirstQuestion';
import { cutTitle, takePendingAsk, writeFirstAsk, writePendingAsk } from './first-ask';
import { useShell } from '../shell-context';
import { PebbleMap } from '../map/PebbleMap';
import { STARTERS, seedStarter, starterPreview, type StarterTemplate } from './starters';
import { MODELS, DEFAULT_MODEL_KEY, modelInfo } from '@/components/board/lib/catalog';
import { RecentBoards, type HomeBoard } from './RecentBoards';
import { editedAgo, firstName, greeting, matchBoards, sortBoards, type SortKey } from './home-format';
import { useDeferredDelete } from './use-deferred-delete';
import '../tokens.css';
import '../account/account.css';
import './home.css';

const VIEW_KEY = 'ct-home-view';

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 700px)');
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}

function useStoredView(): ['grid' | 'list', (v: 'grid' | 'list') => void] {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  useEffect(() => {
    try { if (localStorage.getItem(VIEW_KEY) === 'list') setView('list'); } catch { /* storage blocked */ }
  }, []);
  const set = useCallback((v: 'grid' | 'list') => {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* storage blocked */ }
  }, []);
  return [view, set];
}

/** The boards home: greeting, start something new, jump back in. */
export function BoardsHome({ api, query = '' }: { api: EngineApi; query?: string }): ReactElement {
  const router = useRouter();
  const { user, keys, openSettings } = useShell();
  const model = () => preferredModel(keys.statuses) ?? MODELS[DEFAULT_MODEL_KEY].engineId;
  const [boards, setBoards] = useState<HomeBoard[] | null>(null);
  const [error, setError] = useState(false);
  const [creating, setCreating] = useState(false);
  const [seeding, setSeeding] = useState<string | null>(null);
  const [starterError, setStarterError] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<HomeBoard | null>(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('edited');
  const [storedView, setView] = useStoredView();
  const narrow = useNarrow();
  const view = narrow ? 'list' : storedView;
  const [now, setNow] = useState(() => Date.now());

  const del = useRef<ReturnType<typeof useDeferredDelete<HomeBoard>> | null>(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      const list = await api.listBoards();
      setNow(Date.now());
      setBoards(list.filter((b) => !del.current?.isPending(b.id)));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace('/auth/signin?callbackUrl=%2Fboards');
        return;
      }
      setError(true);
    }
  }, [api, router]);

  const deleter = useDeferredDelete<HomeBoard>(api, {
    onRemoved: (b) => setBoards((l) => l && l.filter((x) => x.id !== b.id)),
    onRestored: (b) => setBoards((l) => (l ? [...l, b] : l)),
    onFailed: () => { void load(); },
  });
  del.current = deleter;

  useEffect(() => { void load(); }, [load]);

  // Delete confirm sheet: focus goes in, Escape and Tab stay inside, focus returns to where it was.
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const open = confirm !== null;
  useEffect(() => {
    if (!open) return;
    const from = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setConfirm(null); return; }
      if (e.key !== 'Tab') return;
      const first = cancelRef.current, last = confirmRef.current;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); from?.focus?.(); };
  }, [open]);

  const create = async () => {
    if (creating) return;
    setCreating(true);
    const id = newId('b');
    try {
      await api.createBoard({ id, title: 'Untitled board' });
      const pref = preferredModel(keys.statuses);
      if (pref) await api.updateCard(id, `${id}_q1`, { data: { model: pref } });
      router.push(`/b/${id}${query}`);
    } catch {
      setCreating(false);
      setError(true);
    }
  };

  // The first question on the empty desk: with a working key it makes the board and asks; without one the sheet opens
  // and the text waits (kept in the box, and across a reload).
  const [ask, setAsk] = useState('');
  const [askNote, setAskNote] = useState(false);
  const askBusy = useRef(false);
  const queued = useRef<string | null>(null);
  useEffect(() => { const p = takePendingAsk(); if (p) setAsk(p); }, []);

  const makeFromQuestion = async (text: string, modelId: string) => {
    if (askBusy.current) return;
    askBusy.current = true;
    setCreating(true);
    const id = newId('b');
    try {
      await api.createBoard({ id, title: cutTitle(text) });
      await api.updateCard(id, `${id}_q1`, { data: { model: modelId } });
      writeFirstAsk(id, text);
      router.push(`/b/${id}${query}`);
    } catch {
      askBusy.current = false;
      setCreating(false);
      setError(true);
    }
  };

  const submitFirst = (text: string) => {
    const t = text.trim();
    if (!t || askBusy.current) return;
    const pref = preferredModel(keys.statuses);
    if (pref) { void makeFromQuestion(t, pref); return; }
    if (keys.statuses === null && !keys.error) { queued.current = t; return; } // keys still loading: decide when they arrive
    setAskNote(false);
    writePendingAsk(t);
    let saved = false;
    openSettings({
      section: 'keys',
      onKeySaved: (p: ProviderId) => {
        saved = true;
        takePendingAsk();
        const provider = PROVIDERS.find((x) => x.id === p)!;
        void makeFromQuestion(t, MODELS[provider.models[0]].engineId);
      },
      onClose: () => { if (!saved) setAskNote(true); },
    });
  };
  const statusesNow = keys.statuses;
  useEffect(() => {
    if (statusesNow !== null && queued.current) { const q = queued.current; queued.current = null; submitFirst(q); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusesNow]);

  const startFrom = async (t: StarterTemplate) => {
    if (seeding || creating) return;
    setSeeding(t.key);
    setStarterError(false);
    try {
      const id = await seedStarter(api, t, { model: model() });
      router.push(`/b/${id}${query}`);
    } catch {
      setSeeding(null);
      setStarterError(true);
    }
  };

  useEffect(() => {
    if (!starterError) return;
    const t = setTimeout(() => setStarterError(false), 6000);
    return () => clearTimeout(t);
  }, [starterError]);

  const rename = (b: HomeBoard, raw: string) => {
    setRenaming(null);
    const title = raw.trim();
    if (!title || title === b.title) return;
    setBoards((l) => l && l.map((x) => (x.id === b.id ? { ...x, title } : x)));
    api.updateBoard(b.id, { title }).catch(() => { void load(); });
  };

  const shown = useMemo(() => (boards ? sortBoards(matchBoards(boards, q), sort) : null), [boards, q, sort]);
  const last = useMemo(() => (boards ? sortBoards(boards, 'edited')[0] : undefined), [boards]);
  const searching = q.trim() !== '';
  const isEmpty = boards !== null && boards.length === 0 && !error;

  return (
    <div className={`ct-shell ct-home ${inter.variable}`}>
      <div className="c-brand glass"><span className="lg"><BrandMark size={24} /></span><b>Context Tree</b></div>
      <span className="ct-shell ct-acct-fixed"><AccountPill /></span>

      <main className="hin">
        <h1 className="greet">{isEmpty ? 'Welcome' : greeting(new Date().getHours())}, {firstName(user.name, user.email)}</h1>
        {isEmpty && <p className="greet-sub">Start from a blank board, or open a starter board to see how desks and branches work.</p>}
        {last && <p className="greet-sub">You last worked on <b>{last.title}</b>, {editedAgo(last.updatedAt, now)}.</p>}

        <div className="rowh">
          <h2>Start something new</h2>
          <span className="chip">Starter boards</span>
          <span className="sp" />
          <button type="button" className="btn primary" onClick={() => void create()} disabled={creating}><Plus size={16} strokeWidth={2} />New board</button>
        </div>
        <div className="starters">
          <button type="button" className="st blank" aria-label="Blank board" onClick={() => void create()} disabled={creating || seeding !== null}>
            <span className="pv"><span><Plus size={22} strokeWidth={2} /></span></span>
            <span className="nm">Blank board</span>
            <span className="ds">An empty desk and a question.</span>
          </button>
          {STARTERS.map((s) => (
            <button key={s.key} type="button" className="st" aria-label={s.name} disabled={creating || seeding !== null} aria-busy={seeding === s.key} onClick={() => void startFrom(s)}>
              <span className="pv"><PebbleMap preview={starterPreview(s)} title={s.name} pad={90} detail={false} size={[214, 136]} /></span>
              <span className="nm">{s.name}</span>
              <span className="ds">{s.blurb}</span>
            </button>
          ))}
        </div>

        {!isEmpty && (
        <div className="rowh rec">
          <h2>Jump back in</h2>
          <span className="sp" />
          {boards && boards.length > 0 && (
            <div className="tools">
              <label className="search">
                <Search size={16} strokeWidth={2} />
                <input type="search" aria-label="Search boards" placeholder="Search boards" value={q} onChange={(e) => setQ(e.target.value)} />
              </label>
              <label className="sortp">
                <span>Sort:</span>
                <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                  <option value="edited">Last edited</option>
                  <option value="name">Name</option>
                </select>
              </label>
              <div className="seg" role="group" aria-label="View">
                <button type="button" className={view === 'grid' ? 'on' : ''} aria-label="Grid view" aria-pressed={view === 'grid'} onClick={() => setView('grid')}><LayoutGrid size={15} strokeWidth={2} /></button>
                <button type="button" className={view === 'list' ? 'on' : ''} aria-label="List view" aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={15} strokeWidth={2} /></button>
              </div>
            </div>
          )}
        </div>
        )}

        {error && (
          <div className="note" role="alert">
            <span>Couldn&apos;t reach your boards.</span>
            <button type="button" className="btn" onClick={() => void load()}>Try again</button>
          </div>
        )}
        {!error && boards === null && (
          <div className="bgrid" aria-busy="true" aria-label="Loading boards">
            {[0, 1, 2, 3].map((i) => <div key={i} className="bc skel"><div className="pv" /></div>)}
          </div>
        )}
        {isEmpty && (
          <div className="emptyd">
            <span className="tabx">Your boards</span>
            <FirstQuestion
              value={ask}
              onChange={(v) => { setAsk(v); setAskNote(false); }}
              onSubmit={() => submitFirst(ask)}
              busy={creating}
              modelLabel={preferredModel(keys.statuses) ? modelInfo(preferredModel(keys.statuses)!).name : null}
              note={askNote}
            />
            <h3>Your first board starts with a question.</h3>
            <p>Type it above and we&apos;ll make the board. Then drop PDFs, links or notes on its desk — that&apos;s what it will read.</p>
            {keys.statuses !== null && !preferredModel(keys.statuses) && (
              <span className="keynag">Answers need an API key from any provider
                <button type="button" className="btn primary" onClick={() => openSettings({ section: 'keys' })}>Add a key</button>
              </span>
            )}
          </div>
        )}
        {shown && boards && boards.length > 0 && shown.length === 0 && <p className="nomatch">No boards match “{q.trim()}”.</p>}
        {shown && shown.length > 0 && (
          <RecentBoards
            boards={shown}
            view={view}
            a={{
              renamingId: renaming,
              now,
              onOpen: (b) => router.push(`/b/${b.id}${query}`),
              onStartRename: (b) => setRenaming(b.id),
              onRename: rename,
              onAskDelete: setConfirm,
            }}
          />
        )}
        {searching && shown && shown.length > 0 && <span className="sr-only" aria-live="polite">{shown.length} boards</span>}
      </main>

      {confirm && (
        <div className="scrim" onClick={() => setConfirm(null)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Delete board" onClick={(e) => e.stopPropagation()}>
            <p>Delete “{confirm.title}”? You can undo for 10 seconds.</p>
            <div className="sheet-actions">
              <button ref={cancelRef} type="button" className="btn" onClick={() => setConfirm(null)}>Cancel</button>
              <button ref={confirmRef} type="button" className="btn primary" onClick={() => { const b = confirm; setConfirm(null); deleter.remove(b); }}>Delete board</button>
            </div>
          </div>
        </div>
      )}

      <div className="toasts" aria-live="polite">
        {starterError && (
          <div className="toast glass" role="alert">
            <span>Couldn&apos;t make that board. Try again.</span>
            <button type="button" className="undo" onClick={() => setStarterError(false)}>OK</button>
          </div>
        )}
        {deleter.toasts.map((b) => (
          <div key={b.id} className="toast glass" role="status">
            <span>Board deleted</span>
            <button type="button" className="undo" onClick={() => deleter.undo(b)}>Undo</button>
          </div>
        ))}
      </div>
    </div>
  );
}
