'use client';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactElement, type ReactNode } from 'react';
import { signOut } from 'next-auth/react';
import { Download, HelpCircle, Key, LogOut, Settings } from 'lucide-react';
import { inter } from '@/components/board/fonts';
import { useEscape } from '@/components/board/chrome/escape';
import { useShell } from '../shell-context';
import { keyStatusLine } from '../keys/status-line';
import { initials } from './initials';
import '../tokens.css';
import './account.css';

// Placeholder until the owner picks the real address.
const HELP_MAILTO = 'mailto:chinmay@contexttree.tech';

function Row({ icon, children, right, danger, ...rest }: {
  icon: ReactNode; children: ReactNode; right?: ReactNode; danger?: boolean;
  onClick?: () => void; href?: string; disabled?: boolean;
}): ReactElement {
  const cls = `mi${danger ? ' danger' : ''}`;
  const inner = (
    <>
      <span className="c">{icon}</span>
      {children}
      {right}
    </>
  );
  if (rest.href) return <a role="menuitem" className={cls} href={rest.href} tabIndex={-1}>{inner}</a>;
  if (rest.disabled) return <div role="menuitem" className={cls} aria-disabled="true">{inner}</div>;
  return <button type="button" role="menuitem" className={cls} tabIndex={-1} onClick={rest.onClick}>{inner}</button>;
}

/** The account avatar (56 px glass pill) and its menu. Lives in the board's top-right and on /boards. */
export function AccountPill(): ReactElement | null {
  const { user, keys, openSettings } = useShell();
  const [open, setOpen] = useState(false);
  const pillRef = useRef<HTMLButtonElement>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) pillRef.current?.focus({ preventScroll: true });
  }, []);

  // Escape from anywhere (the board's own listener asks the newest open layer first, so the card stays selected).
  useEscape(open, () => close(true));

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [open]);

  if (!user.email) return null;

  const items = (): HTMLElement[] =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      e.stopPropagation();
      // React listens on the document in the app router, so also stop the board's own document listener.
      e.nativeEvent.stopImmediatePropagation();
      close(true);
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    if (!open) { setOpen(true); return; }
    const list = items();
    if (!list.length) return;
    const i = list.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1
      : e.key === 'ArrowDown' ? (i + 1) % list.length
      : (i <= 0 ? list.length - 1 : i - 1);
    list[next].focus();
  };

  const line = keyStatusLine(keys.statuses);
  const run = (fn: () => void) => () => { close(false); fn(); };

  return (
    <span ref={wrapRef} className={`ct-shell ct-acct-wrap ${inter.variable}`} onKeyDown={onKeyDown}>
      <button
        ref={pillRef}
        type="button"
        className={`ct-acct glass${open ? ' on' : ''}`}
        aria-label="Account"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="av" aria-hidden="true">{initials(user.name, user.email)}</span>
      </button>
      {open && (
        <div ref={menuRef} role="menu" aria-label="Account menu" className="ct-acctm glass">
          <div className="who">
            <div className="av lg2" aria-hidden="true">{initials(user.name, user.email)}</div>
            <div className="wt">
              <b>{user.name ?? user.email}</b>
              <span>{user.email}</span>
            </div>
          </div>
          <div className="plan"><Key size={14} strokeWidth={2} /><span><b>Free plan</b> · runs on your own keys</span></div>
          <Row
            icon={<Key size={16} strokeWidth={2} />}
            onClick={run(() => openSettings({ section: 'keys' }))}
            right={<span className="r keystat"><i className={`dot ${line.tone}`} />{line.text}</span>}
          >API keys</Row>
          <Row icon={<Settings size={16} strokeWidth={2} />} onClick={run(() => openSettings({ section: 'account' }))}>Settings</Row>
          <Row icon={<Download size={16} strokeWidth={2} />} disabled right={<span className="r soon">Soon</span>}>Export my boards</Row>
          <Row icon={<HelpCircle size={16} strokeWidth={2} />} href={HELP_MAILTO}>Help &amp; feedback</Row>
          <div className="sep" role="separator" />
          <Row icon={<LogOut size={16} strokeWidth={2} />} danger onClick={run(() => { void signOut({ callbackUrl: '/' }); })}>Sign out</Row>
          <div className="ver"><span>Context Tree V3</span><span><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></span></div>
        </div>
      )}
    </span>
  );
}
