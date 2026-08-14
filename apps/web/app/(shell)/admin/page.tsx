import type { CSSProperties } from 'react';

export default function AdminPage() {
  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <h1 style={{ margin: 0 }}>Admin shell</h1>
      <p
        style={{
          color: 'var(--sc-color-semantic-textSecondary)',
          marginTop: 0,
        }}
      >
        Operations, audit, users, devices and settings will anchor here once
        backend contracts are wired.
      </p>
      <div
        style={{
          display: 'grid',
          gap: 'var(--sc-spacing-4)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        }}
      >
        {['Operations', 'Audit', 'Users & Devices', 'Settings'].map((item) => (
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
