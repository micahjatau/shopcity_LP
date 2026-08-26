import Image from 'next/image';
import Link from 'next/link';
import { LoginForm } from '../../../components/auth/login-form';

export default function LoginPage() {
  return (
    <main
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 420px) 1fr',
        gap: 'var(--sc-spacing-6)',
        alignItems: 'stretch',
      }}
    >
      <article
        style={{
          borderRadius: 'var(--sc-radius-xl)',
          overflow: 'hidden',
          background:
            'linear-gradient(135deg, var(--sc-color-brand-700), var(--sc-color-brand-500))',
          color: 'var(--sc-color-neutral-0)',
          padding: 'var(--sc-spacing-8)',
          display: 'grid',
          gap: 'var(--sc-spacing-5)',
        }}
      >
        <Image
          src="/brand/shopcity-lockup-white.svg"
          alt="ShopCity Supermarket"
          width={280}
          height={84}
          priority
        />
        <h1
          style={{
            margin: 0,
            fontSize: 'var(--sc-font-size-h1)',
            lineHeight: 'var(--sc-font-lineHeight-h1)',
          }}
        >
          Sign in to the ShopCity retail operations shell.
        </h1>
        <p style={{ margin: 0, maxWidth: 420 }}>
          Sign in with a backend-authenticated ShopCity session to reach role-
          scoped cashier, supervisor and admin workflows.
        </p>
        <Link
          href="/"
          style={{
            alignSelf: 'start',
            background: 'rgba(255,255,255,0.14)',
            border: '1px solid rgba(255,255,255,0.24)',
            color: 'var(--sc-color-neutral-0)',
            borderRadius: 'var(--sc-radius-full)',
            padding: '12px 18px',
          }}
        >
          Back to overview
        </Link>
      </article>

      <article
        style={{
          borderRadius: 'var(--sc-radius-xl)',
          background: 'var(--sc-color-neutral-0)',
          padding: 'var(--sc-spacing-8)',
          border: '1px solid var(--sc-color-semantic-border)',
          boxShadow: 'var(--sc-shadow-level1)',
          display: 'grid',
          gap: 'var(--sc-spacing-4)',
          alignContent: 'start',
        }}
      >
        <h2 style={{ margin: 0 }}>Session bootstrap</h2>
        <p
          style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}
        >
          The form calls the backend current-user and login contracts, then
          routes the session into the correct shell.
        </p>
        <LoginForm />
      </article>
    </main>
  );
}
