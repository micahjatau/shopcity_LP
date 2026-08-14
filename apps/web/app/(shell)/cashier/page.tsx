import type { CSSProperties } from 'react';

export default function CashierPage() {
  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <h1 style={{ margin: 0 }}>Cashier shell</h1>
      <p
        style={{
          color: 'var(--sc-color-semantic-textSecondary)',
          marginTop: 0,
        }}
      >
        Fast earn, redeem, customer lookup and sync entry points will land here.
      </p>
      <div
        style={{
          display: 'grid',
          gap: 'var(--sc-spacing-4)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        }}
      >
        {['Lookup', 'Earn', 'Redeem', 'Customers', 'Sync'].map((item) => (
          <article key={item} style={cardStyle}>
            <strong>{item}</strong>
            <p style={muted}>Route placeholder</p>
          </article>
        ))}
      </div>
    </section>
  );
}

const cardStyle: CSSProperties = {
  background: 'var(--sc-color-neutral-0)',
  border: '1px solid var(--sc-color-semantic-border)',
  borderRadius: 'var(--sc-radius-lg)',
  padding: 'var(--sc-spacing-5)',
  boxShadow: 'var(--sc-shadow-level1)',
};

const muted: CSSProperties = {
  color: 'var(--sc-color-semantic-textSecondary)',
  marginBottom: 0,
};
