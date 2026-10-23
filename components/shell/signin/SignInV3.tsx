'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Shield } from 'lucide-react';
import { inter } from '@/components/board/fonts';
import { BrandMark } from '@/components/board/chrome/BrandMark';
import { PebbleMap } from '../map/PebbleMap';
import { THESIS_PREVIEW } from '../map/demo-previews';
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

function Backdrop() {
  return (
    <div className="si-bg" aria-hidden="true">
      <PebbleMap preview={THESIS_PREVIEW} title="a research board" detail pad={40} size={[1440, 900]} />
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
          <div className="lg"><BrandMark size={32} /></div>
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
