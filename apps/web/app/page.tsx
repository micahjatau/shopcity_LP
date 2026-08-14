import Link from 'next/link';

type RouteHref = '/' | '/login' | '/cashier' | '/supervisor' | '/admin';

const roleCards: Array<{
  href: RouteHref;
  label: string;
  description: string;
}> = [
  {
    href: '/cashier',
    label: 'Cashier shell',
    description: 'Fast lookup, earn, redeem and sync entry points.',
  },
  {
    href: '/supervisor',
    label: 'Supervisor shell',
    description: 'Review approvals, fraud, reports and customer operations.',
  },
  {
    href: '/admin',
    label: 'Admin shell',
    description: 'Audit, devices and operational control surfaces.',
  },
];

export default function HomePage() {
  return (
    <section
      style={{
        display: 'grid',
        gap: 'var(--sc-spacing-6)',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        alignItems: 'start',
      }}
    >
      <div
        style={{
          gridColumn: '1 / -1',
          borderRadius: 'var(--sc-radius-xl)',
          padding: 'var(--sc-spacing-8)',
          background: 'var(--sc-color-neutral-0)',
          boxShadow: 'var(--sc-shadow-level1)',
          border: '1px solid var(--sc-color-semantic-border)',
        }}
      >
        <p
          style={{
            marginTop: 0,
            color: 'var(--sc-color-semantic-textSecondary)',
          }}
        >
          Frontend design-system scaffold
        </p>
        <h1
          style={{
            margin: 0,
            fontSize: 'var(--sc-font-size-display)',
            lineHeight: 'var(--sc-font-lineHeight-display)',
          }}
        >
          Ship the ShopCity retail experience with contract-backed shells.
        </h1>
        <p
          style={{
            maxWidth: 720,
            fontSize: 'var(--sc-font-size-lg)',
            lineHeight: 'var(--sc-font-lineHeight-lg)',
          }}
        >
          This starter app uses the approved ShopCity tokens and brand assets,
          and exposes the first cashier, supervisor and admin routes that will
          later connect to the generated OpenAPI client.
        </p>
        <div
          style={{
            display: 'flex',
            gap: 'var(--sc-spacing-3)',
            flexWrap: 'wrap',
          }}
        >
          <Link
            href="/login"
            style={{
              background: 'var(--sc-color-semantic-actionPrimary)',
              color: 'var(--sc-color-semantic-actionPrimaryText)',
              padding: '12px 18px',
              borderRadius: 'var(--sc-radius-full)',
            }}
          >
            Open login
          </Link>
          <Link
            href="/cashier"
            style={{
              background: 'var(--sc-color-neutral-0)',
              color: 'var(--sc-color-semantic-textPrimary)',
              padding: '12px 18px',
              borderRadius: 'var(--sc-radius-full)',
              border: '1px solid var(--sc-color-semantic-border)',
            }}
          >
            Enter cashier shell
          </Link>
        </div>
      </div>

      {roleCards.map((card) => (
        <article
          key={card.href}
          style={{
            borderRadius: 'var(--sc-radius-lg)',
            padding: 'var(--sc-spacing-5)',
            background: 'var(--sc-color-neutral-0)',
            boxShadow: 'var(--sc-shadow-level1)',
            border: '1px solid var(--sc-color-semantic-border)',
          }}
        >
          <h2 style={{ marginTop: 0 }}>{card.label}</h2>
          <p style={{ color: 'var(--sc-color-semantic-textSecondary)' }}>
            {card.description}
          </p>
          <Link
            href={card.href}
            style={{ color: 'var(--sc-color-brand-600)', fontWeight: 600 }}
          >
            View route →
          </Link>
        </article>
      ))}
    </section>
  );
}
