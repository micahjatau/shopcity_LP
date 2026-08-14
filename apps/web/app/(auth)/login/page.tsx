import Image from 'next/image';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <section
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
          This login surface will later connect to the backend session
          bootstrap, CSRF handling and current-user contract.
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
        <h2 style={{ margin: 0 }}>Session bootstrap stub</h2>
        <p
          style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}
        >
          The next iteration will call the backend current-user endpoint and
          branch users into the appropriate shell.
        </p>
        <form style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
          <label style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
            <span>Tenant / email / username</span>
            <input
              type="text"
              placeholder="cashier@shopcity.local"
              style={{
                minHeight: 'var(--sc-size-control)',
                padding: '0 var(--sc-spacing-4)',
                borderRadius: 'var(--sc-radius-md)',
                border: '1px solid var(--sc-color-semantic-borderStrong)',
              }}
            />
          </label>
          <label style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
            <span>Password</span>
            <input
              type="password"
              placeholder="••••••••"
              style={{
                minHeight: 'var(--sc-size-control)',
                padding: '0 var(--sc-spacing-4)',
                borderRadius: 'var(--sc-radius-md)',
                border: '1px solid var(--sc-color-semantic-borderStrong)',
              }}
            />
          </label>
          <button
            type="button"
            style={{
              minHeight: 'var(--sc-size-control)',
              border: 0,
              borderRadius: 'var(--sc-radius-full)',
              background: 'var(--sc-color-semantic-actionPrimary)',
              color: 'var(--sc-color-semantic-actionPrimaryText)',
              fontWeight: 600,
            }}
          >
            Sign in
          </button>
        </form>
      </article>
    </section>
  );
}
