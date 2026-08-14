'use client';

import { StatusBadge } from '../shopcity';

const items = [
  { label: 'Outbox backlog', value: '12 pending', tone: 'warning' as const },
  { label: 'SMS delivery', value: '98% delivered', tone: 'success' as const },
  { label: 'Offline sync', value: '2 failed', tone: 'danger' as const },
  { label: 'Report freshness', value: 'Fresh', tone: 'success' as const },
];

export function PilotHealthPanel() {
  return (
    <section
      style={{
        borderRadius: 'var(--sc-radius-xl)',
        padding: 'var(--sc-spacing-5)',
        background: 'var(--sc-color-neutral-0)',
        border: '1px solid var(--sc-color-semantic-border)',
        boxShadow: 'var(--sc-shadow-level1)',
        display: 'grid',
        gap: 'var(--sc-spacing-4)',
      }}
    >
      <header>
        <h2 style={{ margin: 0 }}>Pilot health</h2>
        <p
          style={{
            margin: 'var(--sc-spacing-1) 0 0',
            color: 'var(--sc-color-semantic-textSecondary)',
          }}
        >
          Backend operations summary for admin review.
        </p>
      </header>
      <div
        style={{
          display: 'grid',
          gap: 'var(--sc-spacing-3)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        }}
      >
        {items.map((item) => (
          <article
            key={item.label}
            style={{
              border: '1px solid var(--sc-color-semantic-border)',
              borderRadius: 'var(--sc-radius-lg)',
              padding: 'var(--sc-spacing-4)',
              background: 'var(--sc-color-semantic-surfaceSubtle)',
            }}
          >
            <p
              style={{
                margin: 0,
                color: 'var(--sc-color-semantic-textSecondary)',
              }}
            >
              {item.label}
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--sc-spacing-3)',
              }}
            >
              <strong>{item.value}</strong>
              <StatusBadge
                label={
                  item.tone === 'warning'
                    ? 'Attention'
                    : item.tone === 'danger'
                      ? 'Needs review'
                      : 'Healthy'
                }
                tone={item.tone}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
