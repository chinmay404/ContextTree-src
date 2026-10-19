'use client';
import './pebble.css';
import './chrome/root.css';
import { useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import type { EngineApi, Id } from './api/types';
import { BoardContext, useBoard, useSnapshot } from './context';
import { BoardEngine } from './engine/board-engine';
import { installTestHook } from './engine/test-hook';
import { bricolage } from './fonts';
import { BoardStore } from './store';
import { AddMenu } from './chrome/AddMenu';
import { BoardInput } from './chrome/BoardInput';
import { BranchSheet } from './chrome/BranchSheet';
import { BrandBar } from './chrome/BrandBar';
import { CompareSheet } from './chrome/CompareSheet';
import { DeleteConfirm } from './chrome/DeleteConfirm';
import { DropOverlay } from './chrome/DropOverlay';
import { FocusView } from './chrome/FocusView';
import { runEscape } from './chrome/escape';
import { SourceViewer } from './chrome/SourceViewer';
import { Toast } from './chrome/Toast';
import { TrailBar } from './chrome/TrailBar';
import { ZoomControl } from './chrome/ZoomControl';

export interface BoardProps {
  api: EngineApi;
  boardId: Id;
  onOpenBoard?: (id: Id) => void;
  onOpenSettings?: (provider?: string) => void;
  isModelLocked?: (engineModelId: string) => boolean;
  topRight?: ReactNode;
  testHook?: boolean;
}

/** The Pebble board. Keyed by boardId: another board is a fresh store and engine. */
export function Board(p: BoardProps): ReactElement {
  return <BoardShell key={p.boardId} {...p} />;
}
export default Board;

const typing = (t: EventTarget | null): t is HTMLElement =>
  t instanceof HTMLElement && !!t.closest('textarea, input, select, [contenteditable="true"]');

function BoardShell(p: BoardProps): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const [inst, setInst] = useState<{ store: BoardStore; engine: BoardEngine } | null>(null);
  const { api, boardId, testHook } = p;

  // Store and engine live for one mount (StrictMode's second mount gets fresh ones).
  useEffect(() => {
    const root = rootRef.current!;
    const rm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const store = new BoardStore(api, boardId);
    const engine = new BoardEngine({ store, root, rm });
    engine.mount();
    const unhook = testHook ? installTestHook(engine, store, api) : () => {};
    setInst({ store, engine });
    void store.load();
    return () => { unhook(); engine.dispose(); store.dispose(); setInst(null); };
  }, [api, boardId, testHook]);

  // One keydown listener for Escape: the newest open layer first, then blur → drop the wire → deselect.
  useEffect(() => {
    if (!inst) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (runEscape()) { e.preventDefault(); return; }
      if (typing(e.target)) { e.target.blur(); return; }
      if (inst.engine.ctx.modules.strings.clearWire()) return;
      inst.store.select(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [inst]);

  const value = useMemo(() => (inst ? { store: inst.store, engine: inst.engine, props: p } : null), [inst, p]);

  return (
    <div ref={rootRef} className={`pb-root ${bricolage.variable}`} data-board={boardId}>
      {value && <BoardContext.Provider value={value}><Chrome /></BoardContext.Provider>}
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
          <TrailBar />
          <ZoomControl />
          <AddMenu />
          <DropOverlay />
          <BoardInput />
          <BranchSheet />
          <SourceViewer />
          <FocusView />
          <CompareSheet />
          <DeleteConfirm />
          <Toast />
        </>
      )}
      {props.topRight ? <div className="pb-topright">{props.topRight}</div> : null}
    </>
  );
}
