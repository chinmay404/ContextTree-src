'use client';
/**
 * The focus view's timeline as a tree (idea from React Bits' Branched Menu): each root question is a section on a
 * trunk, its branches hang off it, and a line is traced from the root to the chat you are in.
 * Only the current family opens by default, so a big board stays short.
 */
import { useState, type ReactElement } from 'react';
import type { Card, Id } from '../api/types';
import { modelInfo } from '../lib/catalog';
import { formatWhen } from '../lib/format';
import { chatData, qNum, type Graph } from '../lib/graph';
import { branchPath, lineX, ROW_H, timelineSections, treeHeight, type TimelineRow } from '../lib/timeline';
import { useBoard } from '../context';
import { Icon } from './Icon';
import { ModelMark } from './ModelMark';
import { readRows, sourceRows } from './focus-rows';

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

export function FocusTimeline({ g, chatId, folded }: { g: Graph; chatId: Id; folded: Set<Id> }): ReactElement {
  const { store } = useBoard();
  const [, redraw] = useState(0);
  const sections = timelineSections(g, chatId);

  // A section is open if it is the current family, or the user opened it; the user can still fold the current one.
  const [opened] = useState(() => new Set<Id>());
  const isOpen = (id: Id, here: boolean): boolean => !folded.has(id) && (here || opened.has(id));
  const toggle = (id: Id, here: boolean): void => {
    if (isOpen(id, here)) { folded.add(id); opened.delete(id); } else { folded.delete(id); opened.add(id); }
    redraw((n) => n + 1);
  };

  /** On the way to the current chat the row says what happened at that step; other rows just say what they are. */
  const story = (s: Card, onPath: boolean): string => {
    const sd = chatData(s);
    const parts = [qNum(g, s.id), modelInfo(sd.model).name];
    if (onPath) {
      const rows = sourceRows(g, store.readsOf(s.id).items, sd.hide ?? []);
      const added = rows.filter((r) => !r.inherited).length;
      parts.push(`Asked with ${plural(readRows(rows).length, 'source')}`);
      if (s.parentId) parts.push(`Branched${sd.inheritDesk === false ? ', fresh start' : ''}${added ? `, added ${plural(added, 'source')}` : ''}`);
    }
    parts.push(s.id === chatId ? 'Now' : formatWhen(s.createdAt));
    return parts.join(' · ');
  };

  const face = (s: Card): ReactElement => (
    <><ModelMark model={modelInfo(chatData(s).model)} /><span className="t">{chatData(s).name}</span><span className="q">{qNum(g, s.id)}</span></>
  );

  const row = (s: Card, cls: string, onPath: boolean, here: boolean, indent?: number): ReactElement => {
    const style = indent === undefined ? undefined : { paddingLeft: indent, height: ROW_H };
    return here
      ? <div className={`${cls} cur`} aria-current="true" title={story(s, true)} style={style}>{face(s)}</div>
      : <button type="button" className={`${cls} st`} data-go={s.id} title={story(s, onPath)} style={style} onClick={() => store.openFocus(s.id)}>{face(s)}</button>;
  };

  const tree = (rows: TimelineRow[], open: boolean): ReactElement => {
    const h = treeHeight(rows.length);
    return (
      <div className="tr-body" inert={!open}>
        <div className="tr-fold-in">
          <div className="tr-tree" style={{ height: h }}>
            <svg className="tr-lines" width="100%" height={h} aria-hidden="true">
              {rows.map((r, k) => <path key={r.id} className="tr-base" d={branchPath(r, k)} />)}
              {rows.map((r, k) => (r.onPath
                ? <path key={r.id} className="tr-reach" pathLength={1} d={branchPath(r, k)} style={{ animationDelay: `${(r.depth - 1) * 140}ms` }} />
                : null))}
            </svg>
            {rows.map((r) => {
              const s = g.cards.get(r.id);
              return s ? <div key={r.id}>{row(s, 'tr-row', r.onPath, r.here, lineX(r.depth) - 8)}</div> : null;
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <nav className="tl" aria-label="Questions on this board">
      {sections.map((sec) => {
        const root = g.cards.get(sec.rootId);
        if (!root) return null;
        const open = isOpen(sec.rootId, sec.here);
        return (
          <div key={sec.rootId} className="tr-sec" data-open={open ? '' : undefined} data-here={sec.here ? '' : undefined}>
            <div className="tr-head">
              {sec.here ? <span className="tr-mark" aria-hidden="true" /> : null}
              {row(root, 'tr-go', sec.here, root.id === chatId)}
              {sec.rows.length ? (
                <button type="button" className="tr-fold" aria-expanded={open} title={open ? 'Hide its branches' : 'Show its branches'}
                  aria-label={`${open ? 'Hide' : 'Show'} the branches of ${chatData(root).name}`} onClick={() => toggle(sec.rootId, sec.here)}>
                  <Icon name="chevron-down" />
                </button>
              ) : null}
            </div>
            {sec.rows.length ? tree(sec.rows, open) : null}
          </div>
        );
      })}
    </nav>
  );
}
