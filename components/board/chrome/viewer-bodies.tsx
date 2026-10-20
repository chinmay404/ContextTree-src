'use client';
/** The body of the source viewer, one component per source type (prototype viewBody, lines 986-1013). */
import { useEffect, useRef, type KeyboardEvent, type ReactElement } from 'react';
import type { Card, SourceData } from '../api/types';
import { TYPE_INFO } from '../lib/catalog';
import { useBoard } from '../context';
import { Icon } from './Icon';

export interface ViewerBodyProps {
  card: Card;
  /** The pile's members when `card` is a pile, else empty. */
  members: Card[];
  /** The raw file (image / audio) when the engine has one, else null. */
  url: string | null;
  /** Opens a member inside its pile. */
  onOpenMember?: (pile: Card, member: Card, anchor: DOMRect) => void;
}

const data = (c: Card): SourceData => c.data as SourceData;
const SOON = { video: 'Reading videos is coming soon', audio: 'Reading audio is coming soon', image: 'Reading images is coming soon' } as const;

function Soon({ text }: { text: string }): ReactElement { return <div className="soonbox">{text}</div>; }

/** Key passages / moments / sections / rows: a button per excerpt, click leaves it out or takes it back. */
function Passages({ card }: { card: Card }): ReactElement | null {
  const { store } = useBoard();
  const ex = data(card).excerpts ?? [];
  if (!ex.length) return null;
  return (
    <div className="passages">
      {ex.map((e, i) => (
        <button key={i} type="button" className={e.on ? '' : 'off'} aria-pressed={e.on} title={e.on ? 'Leave this out' : 'Use this'}
          onClick={() => store.setExcerpt(card.id, i, !e.on)}>
          {e.loc ? <span className="chipl">{e.loc}</span> : null}<span>{e.text}</span>
        </button>
      ))}
    </div>
  );
}

function VideoBody({ card }: { card: Card }): ReactElement {
  const d = data(card);
  const dur = (d.meta ?? '').includes('·') ? (d.meta ?? '').split('·').pop()!.trim() : '';
  return (
    <>
      <div className="hero">
        {d.ytid ? <img src={`https://i.ytimg.com/vi/${encodeURIComponent(d.ytid)}/hqdefault.jpg`} alt="" /> : null}
        <span className="pb"><Icon name="play" /></span>
        {dur ? <span className="dur">{dur}</span> : null}
      </div>
      <Soon text={SOON.video} />
    </>
  );
}

function AudioBody({ url }: { url: string | null }): ReactElement {
  return (
    <>
      <div className="hero audio">
        <div className="bars">
          {Array.from({ length: 64 }, (_, i) => <i key={i} className={i < 26 ? 'on' : ''} style={{ height: `${20 + Math.abs(Math.sin(i * 1.7)) * 75}%` }} />)}
        </div>
      </div>
      {url ? <audio controls src={url} className="vaudio" /> : null}
      <Soon text={SOON.audio} />
    </>
  );
}

function PdfBody({ card }: { card: Card }): ReactElement {
  const d = data(card), ex = d.excerpts ?? [];
  const pages = parseInt((d.meta ?? '').match(/(\d+) pages/)?.[1] ?? '', 10) || 12;
  const hit = new Set(ex.filter((e) => e.on).map((e) => parseInt((e.loc ?? '').replace(/\D/g, ''), 10)));
  return (
    <>
      <div className="sec">Pages</div>
      <div className="pages">
        {Array.from({ length: Math.min(pages, 24) }, (_, i) => (
          <div key={i} className={`pg ${hit.has(i + 1) ? 'hit' : ''}`}><b />{Array.from({ length: 9 }, (_, k) => <span key={k} />)}<em>p. {i + 1}</em></div>
        ))}
      </div>
      <div className="sec">Overview</div>
      <p className="summary">{d.summary || `${pages} pages. ${ex.map((e) => e.text).join(' ')}`}</p>
      <div className="sec">Key passages</div>
      <Passages card={card} />
    </>
  );
}

/** A note is edited here (one save after typing stops); a doc is shown as it was read. */
function NoteBody({ card }: { card: Card }): ReactElement {
  const { store, engine } = useBoard();
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const t = setTimeout(() => ref.current?.focus(), 80); return () => clearTimeout(t); }, [card.id]);
  const onInput = (text: string): void => {
    store.patchDataDebounced(card.id, { text });
    // A card face does not follow store changes by itself: every chat that reads this note is drawn again so "Source changed" shows.
    for (const c of store.graph().cards.values()) {
      if (c.kind === 'chat' && store.readsOf(c.id).items.some((i) => i.cardId === card.id)) engine?.ctx.render(c.id);
    }
  };
  return (
    <textarea ref={ref} key={card.id} className="editor" placeholder="Write here…" defaultValue={data(card).text ?? ''}
      onChange={(e) => onInput(e.target.value)} />
  );
}

function DocBody({ card }: { card: Card }): ReactElement {
  return <div className="editor ro" tabIndex={0} aria-label="Document text, read only">{data(card).text || 'Empty document'}</div>;
}

function WebBody({ card }: { card: Card }): ReactElement {
  const d = data(card);
  return (
    <>
      <div className="webprev">
        <div className="bar"><i /><i /><i />{d.meta}</div>
        <div className="bd"><h3>{d.title}</h3><p>{d.summary || (d.excerpts ?? []).map((e) => e.text).join(' ')}</p></div>
      </div>
      <div className="sec">Sections the AI uses</div>
      <Passages card={card} />
    </>
  );
}

function CsvBody({ card }: { card: Card }): ReactElement {
  const t = data(card).table;
  return (
    <>
      {t ? (
        <div className="tbl"><table>
          <thead><tr>{t.columns.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
          <tbody>{t.rows.map((r, i) => <tr key={i}>{r.map((c, k) => <td key={k}>{c}</td>)}</tr>)}</tbody>
        </table></div>
      ) : null}
      <div className="sec">Rows the AI uses</div>
      <Passages card={card} />
    </>
  );
}

function ImageBody({ card, url }: { card: Card; url: string | null }): ReactElement {
  const d = data(card);
  return (
    <>
      <div className="imgbig">
        {url ? <img src={url} alt={d.desc || d.title || ''} /> : (
          <div className="mock3">
            <div><b /><i /><span /><span /></div>
            <div className="mid"><b /><i /><span /><span /><span /></div>
            <div><b /><i /><span /></div>
          </div>
        )}
      </div>
      <Soon text={SOON.image} />
    </>
  );
}

function PileBody({ card, members, onOpenMember }: { card: Card; members: Card[]; onOpenMember?: ViewerBodyProps['onOpenMember'] }): ReactElement {
  const { store } = useBoard();
  const toggle = (m: Card): void => store.setMemberOff(m.id, !data(m).off);
  const onKey = (e: KeyboardEvent, m: Card): void => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(m); } };
  return (
    <>
      <div className="sec">{members.length} {members.length === 1 ? 'file' : 'files'} in this pile</div>
      <div className="members">
        {members.map((m) => {
          const off = data(m).off === true, info = TYPE_INFO[m.sourceType ?? 'pdf'];
          return (
            <div key={m.id} className={`mrow f-${info.family} ${off ? 'off' : ''}`}>
              <button type="button" onClick={(e) => onOpenMember?.(card, m, e.currentTarget.getBoundingClientRect())}>
                <span className="tile"><Icon name={info.icon} /></span>
                <span className="sx"><span className="meta">{data(m).meta || info.label}</span><span className="ttl">{data(m).title || 'Untitled'}</span></span>
              </button>
              <span role="switch" tabIndex={0} data-memoff aria-checked={!off} aria-label={`Read ${data(m).title || 'this file'}`} title={off ? 'Switched off: the AI does not read it' : 'Switch off so the AI skips it'}
                className="msw" onClick={() => toggle(m)} onKeyDown={(e) => onKey(e, m)}><i /></span>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function ViewerBody({ card, members, url, onOpenMember }: ViewerBodyProps): ReactElement | null {
  switch (card.sourceType) {
    case 'video': return <VideoBody card={card} />;
    case 'audio': return <AudioBody url={url} />;
    case 'pdf': return <PdfBody card={card} />;
    case 'note': return <NoteBody card={card} />;
    case 'doc': return <DocBody card={card} />;
    case 'web': return <WebBody card={card} />;
    case 'csv': return <CsvBody card={card} />;
    case 'image': return <ImageBody card={card} url={url} />;
    case 'pile': return <PileBody card={card} members={members} onOpenMember={onOpenMember} />;
    default: return null;
  }
}
