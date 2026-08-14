'use client';

import { useEffect, useState } from 'react';
import {
  approvalsControllerDecideApprovalV1,
  approvalsControllerListApprovalsV1,
  type ApprovalDecisionDtoDecision,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Button, RadioGroup } from '../ui';
import { StatusBadge } from '../shopcity';

export function ApprovalsPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Loading approvals…');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decision, setDecision] = useState<ApprovalDecisionDtoDecision>('APPROVED');

  async function refresh() {
    setLoading(true);
    try {
      const response = await approvalsControllerListApprovalsV1(
        { limit: '3', cursor: '' },
        createApiRequest({ csrf: true }),
      );
      if (response.status === 200) {
        setItems(response.data.data.items as any[]);
        setSelectedId((response.data.data.items[0] as { id?: string } | undefined)?.id ?? null);
        setMessage(`Loaded ${response.data.data.items.length} approvals.`);
      } else {
        setMessage(`Approvals unavailable (${response.status}).`);
      }
    } catch {
      setMessage('Approvals unavailable.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleDecision() {
    if (!selectedId) return;
    await approvalsControllerDecideApprovalV1(
      selectedId,
      { decision, reason: decision === 'APPROVED' ? 'Approved from frontend shell' : 'Rejected from frontend shell' },
      createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
    );
    setMessage(`Decision sent for ${selectedId}.`);
    void refresh();
  }

  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
        <Button variant="secondary" onClick={() => void refresh()} loading={loading}>Refresh approvals</Button>
        <Button onClick={() => void handleDecision()} disabled={!selectedId}>Submit decision</Button>
      </div>
      <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>{message}</p>
      <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
        {items.slice(0, 3).map((item) => (
          <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} style={{ textAlign: 'left', padding: 'var(--sc-spacing-4)', borderRadius: 'var(--sc-radius-lg)', border: `1px solid ${selectedId === item.id ? 'var(--sc-color-brand-600)' : 'var(--sc-color-semantic-border)'}`, background: 'var(--sc-color-neutral-0)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sc-spacing-3)' }}>
              <strong>{item.customer?.fullName ?? item.id}</strong>
              <StatusBadge label={item.status} tone={item.status === 'PENDING' ? 'warning' : 'neutral'} />
            </div>
            <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>{item.reasonCode ?? 'No reason code'}</p>
          </button>
        ))}
      </div>
      <RadioGroup name="approval-decision" legend="Decision" options={[{ value: 'APPROVED', label: 'Approve' }, { value: 'REJECTED', label: 'Reject' }]} value={decision} onValueChange={(value) => setDecision(value as ApprovalDecisionDtoDecision)} />
    </section>
  );
}
