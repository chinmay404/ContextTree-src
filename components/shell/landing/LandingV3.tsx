import type { ReactElement, ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, GitFork, Sparkles, StickyNote } from 'lucide-react';
import { inter } from '@/components/board/fonts';
import { BrandMark } from '@/components/board/chrome/BrandMark';
import { MODELS } from '@/components/board/lib/catalog';
import { PebbleMap } from '../map/PebbleMap';
import { LANDING_PREVIEWS } from '../map/demo-previews';
import type { BoardPreview } from '../map/preview-types';
import { COPY, keylineText } from './copy';
import '../tokens.css';
import './landing.css';

const DOTS = ['#E2C65E', '#A5CBE3', '#E6A9BE'];

function Tab({ children, dots }: { children: ReactNode; dots?: boolean }): ReactElement {
  return (
    <span className="tabx">
      {children}
      {dots && <span className="dots" aria-hidden="true">{DOTS.map((c) => <i key={c} style={{ background: c }} />)}</span>}
    </span>
  );
}

/**
 * A board illustration. Static for now: the server-rendered map is what a visitor without JS sees anyway.
 * TODO(controller): mount the read-only showcase Board here once plan Tasks 5 and 23 land (map stays as the placeholder).
 */
function ShowcaseSlot({ preview, title, labels = true, className = 'mini', height, children }: {
  preview: BoardPreview; title: string; labels?: boolean; className?: string; height?: number; children?: ReactNode;
}): ReactElement {
  return (
    <div className={className} style={height ? { height } : undefined}>
      <PebbleMap preview={preview} title={title} labels={labels} pad={60} size={[1000, 600]} />
      {children}
    </div>
  );
}

/** Feature 3: a card opened big, with the timeline on the left (mockup F3_FOCUS, static). */
function FocusPeek(): ReactElement {
  return (
    <div className="mini focusbox" style={{ height: 400 }} role="img" aria-label="A long answer opened full page, with the questions that led to it on the left">
      <div className="focusmini" aria-hidden="true">
        <div className="tlp">
          <h5>Timeline</h5>
          <div className="fst"><i /><span>How should I price Context Tree?<small>Q1 · Claude · 2 sources</small></span></div>
          <div className="fst now"><i /><span>Second opinion with real customers<small>Q1.2 · Gemini · 4 sources</small></span></div>
          <h5 style={{ marginTop: 6 }}>Connected sources</h5>
          <div className="fst"><i style={{ borderColor: '#3F7FA8' }} /><span>Why we doubled our price<small>harbor.dev</small></span></div>
          <div className="fst"><i style={{ borderColor: '#9A7B2E' }} /><span>Customer interviews<small>4 files</small></span></div>
        </div>
        <div className="rd">
          <span className="back"><ArrowLeft size={10} strokeWidth={2} />Board · Esc</span>
          <span className="ub">Same question, with the blog post and the interviews too.</span>
          <div className="rt">Start at $15 a month.</div>
          <p className="rp">The two new sources both point above the $12 the first answer suggested. The blog post reports that doubling the price lost only 6% of users, and two of three interviewees said they would pay $15.</p>
        </div>
      </div>
    </div>
  );
}

/** Feature 4: the model picker over the board (static). */
function PickerPeek(): ReactElement {
  const rows = [MODELS.claude, MODELS.gpt, MODELS.gemini, MODELS.gptoss];
  return (
    <>
      <div className="pick" aria-hidden="true">
        <h6>Ask this question with</h6>
        {rows.map((m, i) => (
          <div key={m.name} className={`pr${i === 1 ? ' on' : ''}${i === 3 ? ' lock' : ''}`}>
            <i className="mdot" style={{ background: m.color }} />{m.name}
            <span className="r">{i === 3 ? 'Add a key' : <Check size={12} strokeWidth={2.5} className="ok" />}</span>
          </div>
        ))}
      </div>
      <div className="carry" aria-hidden="true"><span className="c"><GitFork size={13} strokeWidth={2} /></span>The desk and the trail come with it</div>
    </>
  );
}

export function LandingV3(): ReactElement {
  const { nav, hero, how, proof, founder, pricing, faq, footer } = COPY;
  return (
    <div className={`ct-shell lp ${inter.variable}`}>
      <nav className="lp-nav" aria-label="Main">
        <a className="c-brand glass" href="/"><span className="lg"><BrandMark size={24} /></span><b>Context Tree</b></a>
        <div className="lp-links glass">
          {nav.links.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
          <a className="si" href={nav.signIn.href}>{nav.signIn.label}</a>
          <a className="btn primary" href={nav.start.href}><span className="lbl-long">{nav.start.label}</span><span className="lbl-short">{nav.start.short}</span></a>
        </div>
      </nav>

      <header className="wrap">
        <div className="hero-top">
          <div>
            <p className="pain">{hero.pain.before}<b>{hero.pain.bold}</b>{hero.pain.after}</p>
            <h1>{hero.h1}</h1>
          </div>
          <div className="hero-copy">
            <p>{hero.body.before}<b>{hero.body.bold}</b>{hero.body.after}</p>
            <div className="ctas">
              <a className="btn primary big" href={hero.primary.href}>{hero.primary.label} <ArrowRight size={17} strokeWidth={2} /></a>
              <a className="btn white big" href={hero.secondary.href}>{hero.secondary.label}</a>
            </div>
            <div className="micro">
              {hero.micro.flatMap((m, i) => (i ? [<i key={`s${i}`} aria-hidden="true">●</i>, <span key={m}>{m}</span>] : [<span key={m}>{m}</span>]))}
            </div>
          </div>
        </div>
      </header>

      <ShowcaseSlot preview={LANDING_PREVIEWS.hero} title="a pricing question with its sources" className="hero-board" />
      <p className="keyline">{keylineText()}</p>

      <main className="wrap">
        <section className="sec" id="how" aria-labelledby="how-h">
          <div className="sec-head">
            <span className="tabx eyebrow">{how.eyebrow} <span className="dots" aria-hidden="true">{DOTS.map((c) => <i key={c} style={{ background: c }} />)}</span></span>
            <h2 id="how-h">{how.h2}</h2>
          </div>
          <div className="feats">
            {how.features.map((f) => {
              const ft = (
                <div className="ft">
                  <h3>{f.h3}</h3>
                  <p>{f.p}</p>
                </div>
              );
              const art =
                f.key === 'desks' ? <ShowcaseSlot preview={LANDING_PREVIEWS.desks} title="one desk with three sources" height={380} />
                : f.key === 'branches' ? <ShowcaseSlot preview={LANDING_PREVIEWS.branches} title="a question with two branches" height={400} />
                : f.key === 'focus' ? <FocusPeek />
                : <ShowcaseSlot preview={LANDING_PREVIEWS.models} title="one question asked on three AIs" height={380}><PickerPeek /></ShowcaseSlot>;
              const cls = f.key === 'desks' ? 'slab wide' : f.key === 'branches' ? 'slab s7' : f.key === 'focus' ? 'slab s5' : 'slab wide flip';
              return (
                <div key={f.key} className={cls} data-feature={f.key}>
                  <Tab dots={f.key === 'desks'}>{f.tab}</Tab>
                  {f.key === 'models' ? <>{ft}{art}</> : <>{art}{ft}</>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="sec" aria-labelledby="proof-h">
          <div className="proof">
            <Tab>{proof.tab}</Tab>
            <h3 id="proof-h">{proof.h3}</h3>
            <p>{proof.p}</p>
            <div className="slots" aria-hidden="true"><i /><i /><i /></div>
          </div>
        </section>

        <section className="sec founder" id="founder" aria-labelledby="founder-h">
          <div className="side">
            <span className="tabx eyebrow" style={{ marginBottom: 16 }}>{founder.eyebrow}</span>
            <h2 id="founder-h">{founder.h2}</h2>
            <p>{founder.side}</p>
          </div>
          <div className="fnote">
            <div className="meta"><StickyNote size={11} strokeWidth={2} />{founder.meta}</div>
            {founder.paragraphs.map((t) => <p key={t}>{t}</p>)}
            <p className="sig">— {founder.sig} <span>{founder.sigNote}</span></p>
          </div>
        </section>

        <section className="sec" id="pricing" aria-labelledby="pricing-h">
          <div className="sec-head">
            <span className="tabx eyebrow">{pricing.eyebrow}</span>
            <h2 id="pricing-h">{pricing.h2}</h2>
          </div>
          <div className="price">
            <div className="pcard free">
              <div className="nm">{pricing.free.name}</div>
              <div className="amt">{pricing.free.amount} <small>{pricing.free.amountNote}</small></div>
              <p className="lead">{pricing.free.lead}</p>
              <ul>{pricing.free.items.map((i) => <li key={i}><Check size={17} strokeWidth={2.2} />{i}</li>)}</ul>
              <a className="btn primary big" href={pricing.free.cta.href}>{pricing.free.cta.label} <ArrowRight size={17} strokeWidth={2} /></a>
            </div>
            <div className="pcard soon">
              <div className="nm">{pricing.hosted.name} <span className="soonchip">{pricing.hosted.chip}</span></div>
              <div className="amt" style={{ fontSize: 40, marginTop: 18 }}>{pricing.hosted.amount}</div>
              <p className="lead">{pricing.hosted.lead}</p>
              <ul>{pricing.hosted.items.map((i) => <li key={i}><Sparkles size={17} strokeWidth={2.2} />{i}</li>)}</ul>
              <a className="btn white big hosted" href={pricing.hosted.cta.href}>{pricing.hosted.cta.label}</a>
            </div>
          </div>
          <div className="faq">
            {faq.map((f) => <div key={f.q}><h4>{f.q}</h4><p>{f.a}</p></div>)}
          </div>
        </section>

        <footer className="lp-foot">
          <span className="bl"><span className="lg"><BrandMark size={20} /></span>Context Tree</span>
          <span>{footer.tagline}</span>
          <nav aria-label="Footer">
            {footer.links.map((l) => <a key={l.label} href={l.href}>{l.label}</a>)}
            <span>{footer.year}</span>
          </nav>
        </footer>
      </main>
    </div>
  );
}
