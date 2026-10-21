'use client';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactElement } from 'react';
import { signOut } from 'next-auth/react';
import { Download, HelpCircle, Key, LogOut, User, X } from 'lucide-react';
import { inter } from '@/components/board/fonts';
import { useShell, type SettingsTarget } from '../shell-context';
import { KeysPanel } from './KeysPanel';
import { PickerPreview } from './PickerPreview';
import type { ProviderId } from '../keys/status-types';
import '../tokens.css';
import './settings.css';

// Placeholder until the owner picks the real address.
const HELP_MAILTO = 'mailto:chinmay@contexttree.tech';

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** The settings sheet (mockup E): API keys with their status, what each key unlocks, and a preview of the model picker. */
export function SettingsSheet({ open, target, onClose, onKeySaved }: {
  open: boolean;
  target?: SettingsTarget;
  onClose(): void;
  onKeySaved?(p: ProviderId): void;
}): ReactElement | null {
  const { user, keys } = useShell();
  const [section, setSection] = useState<'keys' | 'account'>(target?.section ?? 'keys');
  const dialogRef = useRef<HTMLDivElement>(null);
  const checkRef = useRef(keys.check);
  checkRef.current = keys.check;

  // A fresh open starts on the requested section and re-checks stale keys (not forced).
  useEffect(() => {
    if (!open) return;
    setSection(target?.section ?? 'keys');
    void checkRef.current();
  }, [open, target]);

  // Focus goes to the target provider's control (handled by its row), else the first nav item.
  useEffect(() => {
    if (!open || target?.provider) return;
    dialogRef.current?.querySelector<HTMLElement>('.knav .ni:not([aria-disabled="true"])')?.focus();
  }, [open, target]);

  // Escape closes the sheet wherever focus is (a saved key form unmounts its own field); the capture phase on window
  // runs before the board's document listener, so a selected card stays selected.
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (e.target instanceof HTMLInputElement && dialogRef.current?.contains(e.target)) return; // the open key form takes its own Escape
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onEsc, true);
    return () => window.removeEventListener('keydown', onEsc, true);
  }, [open, onClose]);

  if (!open) return null;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (e.defaultPrevented) return; // an open key form took it
      e.preventDefault();
      e.stopPropagation();
      // The board listens on the document too; this keeps a selected card selected.
      e.nativeEvent.stopImmediatePropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const nodes = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter((n) => n.offsetParent !== null);
    if (!nodes.length) return;
    const first = nodes[0], last = nodes[nodes.length - 1];
    const a = document.activeElement;
    if (e.shiftKey && (a === first || !dialogRef.current?.contains(a))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (a === last || !dialogRef.current?.contains(a))) { e.preventDefault(); first.focus(); }
  };

  return (
    <div
      className={`ct-shell ct-settings ${inter.variable}`}
      onKeyDown={onKeyDown}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={dialogRef} className="keys" role="dialog" aria-modal="true" aria-label="Settings">
        <button type="button" className="kclose glass" aria-label="Close settings" onClick={onClose}><X size={16} strokeWidth={2} /></button>
        <nav className="knav" aria-label="Settings sections">
          <h3>Settings</h3>
          <button type="button" className={`ni${section === 'keys' ? ' on' : ''}`} aria-current={section === 'keys' ? 'page' : undefined} onClick={() => setSection('keys')}>
            <span className="c"><Key size={15} strokeWidth={2} /></span>API keys
          </button>
          <button type="button" className={`ni${section === 'account' ? ' on' : ''}`} aria-current={section === 'account' ? 'page' : undefined} onClick={() => setSection('account')}>
            <span className="c"><User size={15} strokeWidth={2} /></span>Account
          </button>
          <div className="ni dis" aria-disabled="true"><span className="c"><Download size={15} strokeWidth={2} /></span>Export &amp; data<span className="soon-tag">Soon</span></div>
          <a className="ni" href={HELP_MAILTO}><span className="c"><HelpCircle size={15} strokeWidth={2} /></span>Help &amp; feedback</a>
          <div className="grow" />
          <button type="button" className="ni signout" onClick={() => void signOut({ callbackUrl: '/' })}>
            <span className="c"><LogOut size={15} strokeWidth={2} /></span>Sign out
          </button>
        </nav>

        {section === 'keys' ? (
          <>
            <KeysPanel keys={keys} focusProvider={target?.provider} onSaved={(p) => onKeySaved?.(p)} />
            <PickerPreview statuses={keys.statuses} />
          </>
        ) : (
          <section className="kmain acct" aria-labelledby="acct-h">
            <div className="khead"><div><h2 id="acct-h">Account</h2><p>You sign in with Google.</p></div></div>
            <dl className="adl">
              <dt>Name</dt><dd>{user.name ?? '—'}</dd>
              <dt>Email</dt><dd>{user.email}</dd>
            </dl>
            <div><button type="button" className="btn" onClick={() => void signOut({ callbackUrl: '/' })}><LogOut size={15} strokeWidth={2} />Sign out</button></div>
          </section>
        )}
      </div>
    </div>
  );
}
