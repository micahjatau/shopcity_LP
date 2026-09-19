'use client';

import Link from 'next/link';
import { useSessionBootstrapState } from '../../../components/session-bootstrap';

export default function ProfilePage() {
  const { status, role, branchId, deviceId, sessionLabel } = useSessionBootstrapState();
  const username = sessionLabel?.split(' · ').at(-1) ?? 'Signed in user';
  const initials = username.slice(0, 2).toUpperCase();
  const home = role === 'SUPERVISOR' ? '/supervisor' : role === 'ADMIN' ? '/admin' : '/cashier';
  return (
    <section className="shopcity-profile">
      <header>
        <p className="shopcity-profile__eyebrow">MY ACCOUNT</p>
        <h1>User profile</h1>
        <p>Your authenticated ShopCity staff account.</p>
      </header>
      <article className="shopcity-profile__card">
        <span className="shopcity-profile__avatar" aria-hidden="true">{initials || 'SC'}</span>
        <div>
          <h2>{username}</h2>
          <p>{role ?? 'Role unavailable'}</p>
        </div>
        <dl>
          <div><dt>Account</dt><dd>{username}</dd></div>
          <div><dt>Role</dt><dd>{role ?? 'Unavailable'}</dd></div>
          <div><dt>Branch</dt><dd>{branchId ?? 'Not assigned'}</dd></div>
          <div><dt>Device association</dt><dd>{deviceId ? 'Linked' : 'Not linked'}</dd></div>
          <div><dt>Session</dt><dd>{status === 'ready' ? 'Active' : 'Unavailable'}</dd></div>
        </dl>
        <Link href={home}>Return to workspace</Link>
      </article>
      <style>{`
        .shopcity-profile { width: min(760px, 100%); margin: 0 auto; display: grid; gap: 24px; }
        .shopcity-profile header h1 { margin: 0 0 8px; font-size: 34px; }
        .shopcity-profile header p { margin: 0; color: var(--sc-color-semantic-textSecondary); }
        .shopcity-profile__eyebrow { color: var(--sc-color-brand-700) !important; font-size: 11px; font-weight: 700; letter-spacing: .08em; }
        .shopcity-profile__card { display: grid; grid-template-columns: 58px 1fr; align-items: center; gap: 12px 18px; padding: clamp(24px, 4vw, 40px); border: 1px solid var(--sc-prototype-border); border-radius: 16px; background: var(--sc-color-neutral-0); }
        .shopcity-profile__avatar { display: grid; place-items: center; width: 58px; height: 58px; border-radius: 50%; background: oklch(72% 0.06 55); color: white; font-weight: 700; }
        .shopcity-profile__card h2, .shopcity-profile__card p { margin: 0; }
        .shopcity-profile__card p { color: var(--sc-color-semantic-textSecondary); }
        .shopcity-profile__card dl { grid-column: 1 / -1; display: grid; gap: 0; margin: 14px 0 8px; }
        .shopcity-profile__card dl > div { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 14px 0; border-top: 1px solid var(--sc-prototype-border); }
        .shopcity-profile__card dt { color: var(--sc-color-semantic-textSecondary); }
        .shopcity-profile__card dd { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
        .shopcity-profile__card a { grid-column: 1 / -1; justify-self: start; color: var(--sc-color-brand-700); font-weight: 600; }
      `}</style>
    </section>
  );
}
