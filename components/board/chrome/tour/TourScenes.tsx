/**
 * The looping scenes of the welcome tour, drawn with the board's own card markup (pebble.css classes) on a
 * 640×320 stage. Timing lives in welcome-tour.css: every animation in a scene runs on that scene's `--T` clock.
 * Spec and visual source: docs/design/onboarding-tour.html.
 */
import type { ReactElement } from 'react';
import { MODELS, type ModelKey } from '../../lib/catalog';
import { Icon } from '../Icon';
import { ModelMark } from '../ModelMark';

export type SceneKey = 'chat' | 'source' | 'desk' | 'string' | 'branch' | 'pile' | 'draw' | 'note';

const Cursor = (): ReactElement => (
  <svg className="t-cur" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 2.5 L4 19 L8.6 14.8 L11.6 21.2 L14.4 19.9 L11.5 13.7 L17.8 13.4 Z" fill="#1D1D1F" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

const Head = ({ model, q, soft }: { model: ModelKey; q: string; soft?: boolean }): ReactElement => (
  <div className="chd"><ModelMark model={{ key: model, name: MODELS[model].name, color: MODELS[model].color }} /><span className="mtag">{MODELS[model].name}</span><span className="sp" /><span className={soft ? 'qchip soft' : 'qchip'}>{q}</span></div>
);

const Src = ({ kind, icon, meta, title, className = '', port }: { kind: string; icon: string; meta: string; title: string; className?: string; port?: boolean }): ReactElement => (
  <div className={`card src f-${kind} ${className}`}>
    <div className="face">
      <div className="sn"><span className="tile"><Icon name={icon} /></span><div className="sx"><span className="meta">{meta}</span><span className="ttl">{title}</span></div></div>
      {port && <span className="port out" />}
    </div>
  </div>
);

/** "Reads no sources yet" swapping to "Reads 1 source" when the scene's source lands. */
const Reads = ({ after }: { after: string }): ReactElement => (
  <div className="cfoot"><Icon name="book-open" size={12} color="#6E6E73" />Reads&nbsp;<span className="t-swap"><span className="t-n0">no sources yet</span><span className="t-n1"><b>{after}</b></span></span></div>
);

function ChatScene(): ReactElement {
  return (
    <>
      <div className="t-add"><span className="t-pl"><Icon name="plus" /></span>Add</div>
      <div className="t-menu">
        <div className="t-mi"><span className="t-c" style={{ background: '#FFE1EA' }}><Icon name="sticky-note" color="#D1467E" /></span>Note<kbd>N</kbd></div>
        <div className="t-mi t-q"><span className="t-c" style={{ background: '#1D1D1F' }}><Icon name="message-circle" color="#fff" /></span>New question<kbd>Q</kbd></div>
        <div className="t-sep" />
        <div className="t-mi"><span className="t-c" style={{ background: '#FFF0B3' }}><Icon name="upload" color="#B8860B" /></span>Upload files</div>
        <div className="t-mi"><span className="t-c" style={{ background: '#C9ECFF' }}><Icon name="link" color="#2A86C4" /></span>Paste a link</div>
      </div>
      <div className="card chat"><div className="face">
        <Head model="claude" q="Q1" />
        <div className="ttl"><span className="t-typ">Which pricing tier first?</span></div>
        <div className="t-slot">
          <div className="thinking"><i />Thinking…</div>
          <div className="ans"><p>Launch with <b>Free</b> and <b>Pro at $12</b>. Most people in the survey would pay once they hit the free limit.</p></div>
        </div>
      </div></div>
      <span className="t-ring t-r1" /><span className="t-ring t-r2" />
      <Cursor />
    </>
  );
}

function SourceScene(): ReactElement {
  return (
    <>
      <div className="t-dropz"><div><b>Drop to add</b><span>We&apos;ll work out what each file is.</span></div></div>
      <Src kind="docs" icon="file-text" meta="PDF · 24 pages" title="Pricing survey 2025" className="t-c1" />
      <Src kind="web" icon="globe" meta="Web page · competitor.com" title="Rival pricing page" className="t-c2" />
      <div className="card src f-media t-c3"><div className="face">
        <div className="sn"><span className="tile"><Icon name="play" /></span><div className="sx"><span className="meta">YouTube · 14 min</span><span className="ttl">Pricing psychology talk</span></div></div>
        <div className="t-proc"><div className="sn"><span className="tile" /><div className="sx"><span className="meta">Reading…</span><span className="ttl">Pricing psychology talk</span><div className="prog"><i /></div></div></div></div>
      </div></div>
    </>
  );
}

function DeskScene(): ReactElement {
  return (
    <>
      <div className="desk"><div className="tab"><span className="qchip">Q1</span><span className="lb">Which pricing tier first?</span><span className="dots"><i style={{ background: '#F5C93A' }} /></span></div><div className="t-hint">Drop sources here to add them to this question only</div></div>
      <div className="card chat"><div className="face">
        <Head model="claude" q="Q1" />
        <div className="ttl">Which pricing tier should we launch with?</div>
        <Reads after="1 source" />
      </div></div>
      <Src kind="docs" icon="file-text" meta="PDF · 24 pages" title="Pricing survey 2025" />
      <Cursor />
    </>
  );
}

function StringScene(): ReactElement {
  return (
    <>
      <svg className="t-lines" aria-hidden="true"><path className="t-wire" d="M241 144 C290 210, 340 190, 379 110" /></svg>
      <Src kind="web" icon="globe" meta="Web page · competitor.com" title="Rival pricing page" port />
      <div className="card chat"><div className="face">
        <span className="port in" /><span className="port out" />
        <Head model="gemini" q="Q2" />
        <div className="ttl">How do rivals price extra seats?</div>
        <Reads after="1 source · strung in" />
      </div></div>
      <Cursor />
    </>
  );
}

function BranchScene(): ReactElement {
  return (
    <>
      <svg className="t-lines" aria-hidden="true"><path className="t-tube" d="M271 68 C340 68, 356 214, 420 214" /></svg>
      <div className="card chat t-parent"><div className="face">
        <span className="port in" /><span className="port out" />
        <Head model="claude" q="Q1" />
        <div className="ttl">Which pricing tier should we launch with?</div>
        <div className="ans"><p>Launch with <b>Free</b> and <b>Pro at $12</b>.</p></div>
      </div></div>
      <div className="card chat t-kid"><div className="face">
        <span className="port in" />
        <Head model="gpt" q="Q1.1" soft />
        <div className="ttl">What if we drop the free tier?</div>
        <div className="t-inh"><Icon name="corner-left-up" />Reads the desk above</div>
      </div></div>
      <Cursor />
    </>
  );
}

function PileScene(): ReactElement {
  return (
    <>
      <div className="t-sheet t-sh2 f-docs" /><div className="t-sheet t-sh1 f-docs" />
      <Src kind="docs" icon="file-text" meta="PDF · 24 pages" title="Pricing survey 2025" className="t-a" />
      <Src kind="docs" icon="file-pen-line" meta="Doc · 9 pages" title="Customer interviews" className="t-b" />
      <span className="t-badge">2</span>
      <span className="t-wheel"><Icon name="mouse" />Scroll to flip</span>
      <Cursor />
    </>
  );
}

const CIRCLE = 'M64 44 C110 12, 262 14, 276 62 C288 110, 118 138, 58 104 C22 84, 34 56, 96 38';
const POINT = 'M292 92 C330 96, 352 104, 382 120';
const POINT_HEAD = 'M366 104 L384 121 L362 130';

function DrawScene(): ReactElement {
  return (
    <>
      <Src kind="docs" icon="file-text" meta="PDF · 24 pages" title="Pricing survey 2025" />
      <div className="card chat"><div className="face">
        <Head model="claude" q="Q1" />
        <div className="ttl">Which pricing tier should we launch with?</div>
        <div className="ans"><p>Launch with <b>Free</b> and <b>Pro at $12</b>.</p></div>
      </div></div>
      <svg className="t-lines" aria-hidden="true">
        <path className="t-ink t-circle" pathLength={1} d={CIRCLE} />
        <path className="t-ink t-point" pathLength={1} d={POINT} />
        <path className="t-ink t-head" pathLength={1} d={POINT_HEAD} />
      </svg>
      <span className="t-pen" style={{ offsetPath: `path('${CIRCLE}')` }}><Icon name="pencil" /></span>
      <div className="t-penbar">
        <span className="t-tool on"><Icon name="pencil" /></span><span className="t-tool"><Icon name="arrow-up-right" /></span>
        <span className="t-tool"><Icon name="highlighter" /></span><span className="t-tool"><Icon name="eraser" /></span>
        <i className="t-dot" /><i className="t-dot t-red" /><i className="t-dot t-blue" />
      </div>
    </>
  );
}

const UNDERLINE = 'M40 112 C110 104, 190 120, 268 108';
const WHY = 'M330 100 C356 74, 390 76, 398 98 C404 118, 372 124, 372 142 M372 164 L373 166';

function NoteScene(): ReactElement {
  return (
    <div className="t-page f-note">
      <div className="t-pagehd"><span className="tile"><Icon name="sticky-note" /></span><b>Launch notes</b></div>
      <p className="t-line"><span className="t-typed">Launch with Free and Pro at $12</span></p>
      <svg className="t-lines" aria-hidden="true">
        <path className="t-ink t-under" pathLength={1} d={UNDERLINE} />
        <path className="t-ink t-why" pathLength={1} d={WHY} />
      </svg>
      <div className="t-penbar">
        <span className="t-tool t-typeb"><Icon name="type" /></span><span className="t-tool t-writeb"><Icon name="pencil" /></span>
        <i className="t-dot t-red" /><i className="t-dot t-blue" />
      </div>
    </div>
  );
}

export const SCENES: Record<SceneKey, () => ReactElement> = {
  chat: ChatScene, source: SourceScene, desk: DeskScene, string: StringScene, branch: BranchScene, pile: PileScene,
  draw: DrawScene, note: NoteScene,
};
