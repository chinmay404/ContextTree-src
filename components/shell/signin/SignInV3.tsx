'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, GitFork, Shield } from 'lucide-react';
import { inter } from '@/components/board/fonts';
import { safeCallback } from './safe-callback';
import '../tokens.css';
import './signin.css';

const ERRORS: Record<string, string> = {
  OAuthSignin: 'Error in constructing an authorization URL.',
  OAuthCallback: 'Error handling response from provider.',
  OAuthCreateAccount: 'Could not create account.',
  EmailCreateAccount: 'Could not create email account.',
  Callback: 'Error in callback handler.',
  OAuthAccountNotLinked: 'Account exists with different provider.',
  EmailSignin: 'Check your email address.',
  CredentialsSignin: 'Sign in failed. Check your details.',
  SessionRequired: 'Please sign in to access this page.',
};
const errorText = (e: string) => ERRORS[e] ?? 'Unable to sign in.';

/** Faint backdrop: a zoomed-out board (desks, pebbles, strings). Static until the shell's PebbleMap lands (plan Task 12). */
const DESKS = [
  { x: 40, y: 330, w: 330, h: 250, l: 'Commons' }, { x: 500, y: 90, w: 300, h: 200, l: 'Ostrom' },
  { x: 500, y: 500, w: 330, h: 260, l: 'Cities' }, { x: 980, y: 60, w: 330, h: 180, l: 'Rules' },
  { x: 980, y: 330, w: 330, h: 180, l: 'Gaps' }, { x: 980, y: 640, w: 330, h: 190, l: 'Survey' },
];
const PEBBLES: [number, number, string][] = [
  [70, 360, '#F3EBCF'], [150, 360, '#F3EBCF'], [230, 360, '#F3EBCF'], [70, 440, '#DCE9F2'],
  [530, 120, '#F3EBCF'], [530, 530, '#F3EBCF'], [610, 530, '#DDE3EE'], [1010, 670, '#E0EBD9'],
  [1010, 100, '#ECECF0'], [1010, 370, '#ECECF0'],
];
const STRINGS = ['M370 450 C470 450 400 190 500 190', 'M370 470 C450 470 420 630 500 630', 'M800 190 C900 190 880 150 980 150', 'M830 630 C900 630 900 420 980 420', 'M830 640 C900 640 920 730 980 730'];

function Backdrop() {
  return (
    <div className="si-bg" aria-hidden="true">
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        {DESKS.map((d) => <rect key={d.l} x={d.x} y={d.y} width={d.w} height={d.h} rx={36} fill="#EBEBF0" />)}
        {STRINGS.map((s) => <path key={s} d={s} fill="none" stroke="#D2D2D7" strokeWidth={7} strokeLinecap="round" />)}
        {PEBBLES.map(([x, y, c]) => <rect key={`${x}-${y}`} x={x} y={y} width={64} height={64} rx={20} fill={c} />)}
        {DESKS.map((d) => <text key={d.l} x={d.x + 22} y={d.y + 26} fontSize={15} fontWeight={700} fill="#6E6E73">{d.l}</text>)}
      </svg>
    </div>
  );
}

export function SignInV3() {
  const params = useSearchParams();
  const error = params.get('error');
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true);
    try {
      await signIn('google', { callbackUrl: safeCallback(params.get('callbackUrl')) });
    } catch {
      setBusy(false); // on success the browser is already redirecting, so stay busy
    }
  };

  return (
    <div className={`ct-shell si-page dotted ${inter.variable}`}>
      <Backdrop />
      <a className="si-back glass" href="/"><ArrowLeft size={15} strokeWidth={2} />contexttree.tech</a>
      <div className="si-wrap">
        <main className="si-sheet">
          <div className="lg"><GitFork size={24} strokeWidth={2} /></div>
          <h1>Sign in to Context Tree</h1>
          <p className="sub">Your boards are where you left them.<br />New here? The same button makes your account.</p>
          {error && <div className="si-err" role="alert">{errorText(error)}</div>}
          <button className="gbtn" onClick={go} disabled={busy} aria-busy={busy}>
            <span className="g">
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            </span>
            {busy ? 'Opening Google…' : 'Continue with Google'}
          </button>
          <div className="si-data"><Shield size={17} strokeWidth={2} /><span>We store your boards and your encrypted API keys. Never sold, never used for training.</span></div>
          <p className="si-legal"><a href="/privacy">Privacy</a> &nbsp;·&nbsp; <a href="/terms">Terms</a></p>
        </main>
      </div>
    </div>
  );
}
