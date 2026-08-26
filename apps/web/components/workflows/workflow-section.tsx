'use client';

import type { ReactNode } from 'react';

export function WorkflowSection({
  title,
  description,
  children,
}: Readonly<{
  title: string;
  description?: string;
  children: ReactNode;
}>) {
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
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-1)' }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        {description ? (
          <p
            style={{
              margin: 0,
              color: 'var(--sc-color-semantic-textSecondary)',
            }}
          >
            {description}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
