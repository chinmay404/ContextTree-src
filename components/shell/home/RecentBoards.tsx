'use client';
import type { ReactElement } from 'react';
import { FAMC } from '@/components/board/lib/catalog';
import type { BoardSummary } from '@/components/board/api/types';
import { PebbleMap } from '../map/PebbleMap';
import type { BoardPreview } from '../map/preview-types';
import { BoardMenu } from './BoardMenu';
import { editedAgo, families, metaLine } from './home-format';

export type HomeBoard = BoardSummary;

export interface RecentActions {
  renamingId: string | null;
  now: number;
  onOpen(b: HomeBoard): void;
  onStartRename(b: HomeBoard): void;
  onRename(b: HomeBoard, raw: string): void;
  onAskDelete(b: HomeBoard): void;
}

const meta = (b: HomeBoard): string =>
  b.preview
    ? metaLine(b.cardCount, b.preview.cards.filter((c) => c.kind === 'chat').length)
    : `${b.cardCount} ${b.cardCount === 1 ? 'card' : 'cards'}`;

function RenameInput({ b, onRename }: { b: HomeBoard; onRename(b: HomeBoard, raw: string): void }): ReactElement {
  return (
    <input
      className="rn-input"
      aria-label="Board name"
      autoFocus
      defaultValue={b.title}
      maxLength={120}
      onBlur={(e) => onRename(b, e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') { e.stopPropagation(); e.currentTarget.value = b.title; e.currentTarget.blur(); }
      }}
    />
  );
}

export function RecentBoards({ boards, view, a }: { boards: HomeBoard[]; view: 'grid' | 'list'; a: RecentActions }): ReactElement {
  if (view === 'list') {
    return (
      <div className="blist">
        <div className="lr head"><span /><span>Name</span><span>Sources</span><span>Last edited</span><span /></div>
        {boards.map((b) => (
          <div key={b.id} className="lr" data-board-row={b.id}>
            <button type="button" className="th" aria-label={`Open ${b.title}`} tabIndex={-1} onClick={() => a.onOpen(b)}>
              <PebbleMap preview={b.preview} title={b.title} detail={false} pad={120} size={[76, 50]} />
            </button>
            {a.renamingId === b.id ? (
              <RenameInput b={b} onRename={a.onRename} />
            ) : (
              <button type="button" className="tx" onClick={() => a.onOpen(b)}>
                <b className="ttl">{b.title}</b>
                <span className="s">{meta(b)}</span>
              </button>
            )}
            <span className="dr dotrow" aria-hidden="true">
              {families(b.preview).map((f) => <i key={f} style={{ background: FAMC[f][1] }} />)}
              {!families(b.preview).length && <span className="w">—</span>}
            </span>
            <span className="w">{editedAgo(b.updatedAt, a.now)}</span>
            <BoardMenu title={b.title} onRename={() => a.onStartRename(b)} onDelete={() => a.onAskDelete(b)} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="bgrid">
      {boards.map((b) => (
        <div key={b.id} className="bc" data-board-card={b.id}>
          <button type="button" className="pv" aria-label={`Open ${b.title}`} tabIndex={-1} onClick={() => a.onOpen(b)}>
            <PebbleMap preview={b.preview} title={b.title} labels pad={80} size={[280, 168]} />
          </button>
          <div className="info">
            {a.renamingId === b.id ? (
              <RenameInput b={b} onRename={a.onRename} />
            ) : (
              <button type="button" className="tx" onClick={() => a.onOpen(b)}>
                <b className="ttl">{b.title}</b>
                <span>{meta(b)}</span>
                <span className="when">Edited {editedAgo(b.updatedAt, a.now)}</span>
              </button>
            )}
            <BoardMenu title={b.title} onRename={() => a.onStartRename(b)} onDelete={() => a.onAskDelete(b)} />
          </div>
        </div>
      ))}
    </div>
  );
}
