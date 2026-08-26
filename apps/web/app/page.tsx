import Link from 'next/link';
import { WorkflowSection } from '../components/workflows';

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
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-6)' }}>
      <WorkflowSection
        title="Frontend design-system scaffold"
        description="ShopCity tokens, brand assets and route shells are wired for the first implementation pass."
      >
        <div
          style={{
            display: 'grid',
            gap: 'var(--sc-spacing-4)',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          }}
        >
          <article style={cardStyle}>
            <strong>Cashier-first</strong>
            <p style={muted}>Fast earn, redeem and sync flows.</p>
          </article>
          <article style={cardStyle}>
            <strong>Supervisor-ready</strong>
            <p style={muted}>Approvals, fraud and report surfaces.</p>
          </article>
          <article style={cardStyle}>
            <strong>Admin operations</strong>
            <p style={muted}>Audit, devices and pilot health.</p>
          </article>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 'var(--sc-spacing-3)',
            flexWrap: 'wrap',
          }}
        >
          <Link href="/login" style={linkButton}>
            Open login
          </Link>
          <Link href="/cashier" style={linkButtonSecondary}>
            View cashier shell
          </Link>
        </div>
      </WorkflowSection>

      <div
        style={{
          display: 'grid',
          gap: 'var(--sc-spacing-4)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        }}
      >
        {roleCards.map((card) => (
          <article key={card.href} style={cardStyle}>
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
      </div>
    </section>
  );
}

const cardStyle = {
  borderRadius: 'var(--sc-radius-lg)',
  padding: 'var(--sc-spacing-5)',
  background: 'var(--sc-color-neutral-0)',
  boxShadow: 'var(--sc-shadow-level1)',
  border: '1px solid var(--sc-color-semantic-border)',
};

const muted = {
  color: 'var(--sc-color-semantic-textSecondary)',
};

const linkButton = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 'var(--sc-size-controlPos)',
  padding: '0 var(--sc-spacing-5)',
  borderRadius: 'var(--sc-radius-full)',
  background: 'var(--sc-color-semantic-actionPrimary)',
  color: 'var(--sc-color-semantic-actionPrimaryText)',
  fontWeight: 600,
};

const linkButtonSecondary = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 'var(--sc-size-controlPos)',
  padding: '0 var(--sc-spacing-5)',
  borderRadius: 'var(--sc-radius-full)',
  background: 'var(--sc-color-neutral-0)',
  color: 'var(--sc-color-semantic-textPrimary)',
  border: '1px solid var(--sc-color-semantic-border)',
  fontWeight: 600,
};
