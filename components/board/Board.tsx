'use client';
/*
 * The Pebble board: React renders `.pb-root` and the chrome; BoardEngine owns everything inside `.pb-vp`.
 *
 * Notes for later tasks:
 * - In dev, React StrictMode mounts twice: the first store/engine pair is disposed at once, so the board loads twice
 *   (two getBoard calls). A test that fails getBoard via MockEngineApi.failNext must queue the failure twice.
 * - The engine does NOT re-render cards on `ui` changes: it only toggles `selected` / `faded` on selection. A card face
 *   that depends on other UI state must mark the card dirty itself (ctx.render(id) / ctx.renderAll()).
 */
import './pebble.css';
import './chrome/root.css';
import { useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import type { EngineApi, Id, ProviderId } from './api/types';
import { BoardContext, useBoard, useSnapshot } from './context';
import { BoardEngine } from './engine/board-engine';
import { installTestHook } from './engine/test-hook';
import { inter } from './fonts';
import { BoardStore } from './store';
import { typing } from './lib/util';
import type { LiveModels } from './lib/catalog';
import { AddMenu } from './chrome/AddMenu';
import { BoardInput } from './chrome/BoardInput';
import { BranchSheet } from './chrome/BranchSheet';
import { CardMenu } from './chrome/CardMenu';
import { PasteBox } from './chrome/PasteBox';
import { BrandBar } from './chrome/BrandBar';
import { CompareSheet } from './chrome/CompareSheet';
import { DeleteConfirm } from './chrome/DeleteConfirm';
import { DropOverlay } from './chrome/DropOverlay';
import { FocusView } from './chrome/FocusView';
import { runEscape } from './chrome/escape';
import { SourceViewer } from './chrome/SourceViewer';
import { Toast } from './chrome/Toast';
// import { TrailBar } from './chrome/TrailBar';   // Trail is parked while ChatBar holds the bottom centre
import { ChatBar } from './chrome/ChatBar';
import { WelcomeTour } from './chrome/WelcomeTour';
import { ZoomControl } from './chrome/ZoomControl';
import './chrome/materials.css'; // its rules override pebble.css and the chrome CSS at equal specificity
import './chrome/colors.css'; // keep last: card colours and the chat rim win over materials.css

export interface BoardProps {
  api: EngineApi;
  boardId: Id;
  onOpenBoard?: (id: Id) => void;
  onOpenSettings?: (provider?: ProviderId) => void;
  /** Asked once, in the board's first question chat, after the first successful load of an empty board. */
  initialAsk?: string;
  /** 'showcase': a read-only board for the landing page: no chrome, no input, nothing saved, fitted to its box. */
  mode?: 'app' | 'showcase';
  /** A key was saved or fixed for `provider` (`at` is a counter or timestamp that changes each time): chats that failed for want of it are re-asked. */
  keyEpoch?: { provider: ProviderId; at: number };
  /** Engine id for new question chats (a model the user has a key for). */
  defaultModel?: string;
  isModelLocked?: (engineModelId: string) => boolean;
  /** Every chat model each working key offers, listed from the provider; shown under "More models". */
  liveModels?: LiveModels;
  topRight?: ReactNode;
  testHook?: boolean;
}

/** The Pebble board. Keyed by boardId: another board is a fresh store and engine. */
export function Board(p: BoardProps): ReactElement {
  return <BoardShell key={p.boardId} {...p} />;
}
export default Board;

function BoardShell(p: BoardProps): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const [inst, setInst] = useState<{ store: BoardStore; engine: BoardEngine } | null>(null);
  const { api, boardId, testHook, initialAsk, defaultModel } = p;
  const showcase = p.mode === 'showcase';
  const asked = useRef(false);   // the initial question goes out once per mounted board
  const live = useRef({ initialAsk, defaultModel });   // read at mount: a changed prop must not rebuild the store
  live.current = { initialAsk, defaultModel };

  // Store and engine live for one mount (StrictMode's second mount gets fresh ones).
  useEffect(() => {
    const root = rootRef.current!;
    const rm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const store = new BoardStore(api, boardId, { defaultModel: live.current.defaultModel });
    const engine = new BoardEngine({ store, root, rm, showcase });
    engine.mount();
    const unhook = testHook ? installTestHook(engine, store, api) : () => {};
    setInst({ store, engine });
    void store.load().then(() => {
      const ask = live.current.initialAsk;
      if (ask && !asked.current && store.getSnapshot().status === 'ready' && store.askFirst(ask)) asked.current = true;
    });
    return () => { unhook(); engine.dispose(); store.dispose(); setInst(null); };
  }, [api, boardId, testHook, showcase]);

  useEffect(() => { inst?.store.setDefaultModel(defaultModel); }, [inst, defaultModel]);
  const { onOpenSettings: openSettings } = p;
  useEffect(() => { inst?.engine.setOpenSettings(openSettings ? (provider) => openSettings(provider) : null); }, [inst, openSettings]);

  // A saved key re-asks what failed for want of it; the epoch already on screen at mount is not a new key.
  const epoch = useRef(p.keyEpoch?.at);
  useEffect(() => {
    const k = p.keyEpoch;
    if (!inst || !k || k.at === epoch.current) return;
    epoch.current = k.at;
    inst.store.retryKeyErrors(k.provider);
  }, [inst, p.keyEpoch]);

  // One keydown listener for Escape: the newest open layer first, then blur → drop the wire → deselect.
  useEffect(() => {
    if (!inst || showcase) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (runEscape()) { e.preventDefault(); return; }
      if (typing(e.target)) { e.target.blur(); return; }
      if (inst.engine.ctx.modules.strings.clearWire()) return;
      inst.store.select(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [inst, showcase]);

  const { onOpenBoard, onOpenSettings, isModelLocked, liveModels, topRight } = p;
  const value = useMemo(
    () => (inst ? { store: inst.store, engine: inst.engine, props: { api, boardId, onOpenBoard, onOpenSettings, isModelLocked, liveModels, topRight, testHook, defaultModel } } : null),
    [inst, api, boardId, onOpenBoard, onOpenSettings, isModelLocked, liveModels, topRight, testHook, defaultModel],
  );

  return (
    <div ref={rootRef} className={`pb-root ${inter.variable}${showcase ? ' pb-showcase' : ''}`} data-board={boardId} data-mode={showcase ? 'showcase' : 'app'}>
      {value && !showcase && <BoardContext.Provider value={value}><Chrome /></BoardContext.Provider>}
    </div>
  );
}

function Chrome(): ReactElement {
  const { store, props } = useBoard();
  const snap = useSnapshot();
  return (
    <>
      <BrandBar />
      {snap.status === 'error' && (
        <div className="float pb-error" role="alert">
          <p>Couldn&apos;t open this board.</p>
          <button className="btn" onClick={() => { void store.load(); }}>Try again</button>
        </div>
      )}
      {snap.status === 'ready' && (
        <>
          {/* <TrailBar /> */}
          <ChatBar />
          <ZoomControl />
          <AddMenu />
          <CardMenu />
          <PasteBox />
          <DropOverlay />
          <BoardInput />
          <BranchSheet />
          <SourceViewer />
          <FocusView />
          <CompareSheet />
          <DeleteConfirm />
          <Toast />
          <WelcomeTour />
        </>
      )}
      {props.topRight ? <div className="pb-topright">{props.topRight}</div> : null}
    </>
  );
}
