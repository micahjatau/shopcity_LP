'use client';

import { useEffect, useState } from 'react';
import { reportsControllerListExecutiveSummaryV1 } from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Button, Table } from '../ui';
import { StatusBadge } from '../shopcity';

export function ReportsWorkspace() {
  const [summary, setSummary] = useState<any | null>(null);
  const [message, setMessage] = useState('Loading report summary…');

  async function refresh() {
    try {
      const response = await reportsControllerListExecutiveSummaryV1({}, createApiRequest({ csrf: true }));
      if (response.status === 200) {
        setSummary(response.data.data);
        setMessage(`Report summary loaded for ${response.data.data.scopeKey}.`);
      } else {
        setMessage(`Reports unavailable (${response.status}).`);
      }
    } catch {
      setMessage('Reports unavailable.');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
        <Button onClick={() => void refresh()}>Refresh summary</Button>
      </div>
      <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>{message}</p>
      {summary ? (
        <>
          <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
            <StatusBadge label={summary.scope} tone="info" />
            <StatusBadge label={summary.branchId ?? 'Tenant-wide'} tone="neutral" />
            <StatusBadge label={summary.timezone} tone="success" />
          </div>
          <Table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {summary.items.slice(0, 5).map((item: Record<string, unknown>, index: number) => {
                const [label, value] = Object.entries(item)[0] ?? [`item-${index + 1}`, 'Unknown'];
                return (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{String(value)}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </>
      ) : null}
    </section>
  );
}
