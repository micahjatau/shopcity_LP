'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  approvalsControllerDecideApprovalV1,
  approvalsControllerListApprovalsV1,
  type ApprovalDecisionDtoDecision,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Alert, Button, Input, RadioGroup, Table } from '../ui';
import { StatusBadge } from '../shopcity';

export function ApprovalsPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Loading approvals…');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decision, setDecision] =
    useState<ApprovalDecisionDtoDecision>('APPROVED');
  const [reason, setReason] = useState('');

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const pendingCount = items.filter((item) => item.status === 'PENDING').length;

  async function refresh() {
    setLoading(true);
    try {
      const response = await approvalsControllerListApprovalsV1(
        { limit: '3', cursor: '' },
        createApiRequest({ csrf: true }),
      );
      if (response.status === 200) {
        const nextItems = response.data.data.items as any[];
        setItems(nextItems);
        setSelectedId((nextItems[0] as { id?: string } | undefined)?.id ?? null);
        setMessage(`Loaded ${nextItems.length} approvals.`);
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
      {
        decision,
        reason:
          reason.trim() ||
          (decision === 'APPROVED'
            ? 'Approved from supervisor review route'
            : 'Rejected from supervisor review route'),
      },
      createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
    );
    setMessage(`Decision sent for ${selectedId}.`);
    void refresh();
  }

  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <div style={statusRow}>
        <StatusBadge label={`Loaded ${items.length}`} tone="info" />
        <StatusBadge label={`Pending ${pendingCount}`} tone="warning" />
        <StatusBadge label={selectedItem ? 'Selected' : 'No selection'} tone="neutral" />
      </div>
      <div
        style={{
          display: 'flex',
          gap: 'var(--sc-spacing-3)',
          flexWrap: 'wrap',
        }}
      >
        <Button
          variant="secondary"
          onClick={() => void refresh()}
          loading={loading}
        >
          Refresh approvals
        </Button>
        <Button onClick={() => void handleDecision()} disabled={!selectedId}>
          Submit decision
        </Button>
      </div>
      <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>
        {message}
      </p>
      {selectedItem ? (
        <>
          <Alert tone="info" title="Selected approval">
            {describeApproval(selectedItem)}
          </Alert>
          <Table>
            <tbody>
              {Object.entries(selectedItem)
                .filter(([key]) =>
                  [
                    'id',
                    'status',
                    'customer',
                    'customerId',
                    'reasonCode',
                    'branchId',
                    'receipt',
                    'amountKobo',
                  ].includes(key),
                )
                .slice(0, 8)
                .map(([key, value]) => (
                  <tr key={key}>
                    <th scope="row">{key}</th>
                    <td>{describeValue(value)}</td>
                  </tr>
                ))}
            </tbody>
          </Table>
        </>
      ) : null}
      {items.length === 0 ? (
        <Alert tone="warning" title="No approvals">
          No approval records matched the current filters.
        </Alert>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
          {items.slice(0, 3).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              style={{
                textAlign: 'left',
                padding: 'var(--sc-spacing-4)',
                borderRadius: 'var(--sc-radius-lg)',
                border: `1px solid ${
                  selectedId === item.id
                    ? 'var(--sc-color-brand-600)'
                    : 'var(--sc-color-semantic-border)'
                }`,
                background: 'var(--sc-color-neutral-0)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 'var(--sc-spacing-3)',
                }}
              >
                <strong>{item.customer?.fullName ?? item.id}</strong>
                <StatusBadge
                  label={item.status}
                  tone={item.status === 'PENDING' ? 'warning' : 'neutral'}
                />
              </div>
              <p
                style={{
                  margin: 0,
                  color: 'var(--sc-color-semantic-textSecondary)',
                }}
              >
                {item.reasonCode ?? 'No reason code'}
              </p>
            </button>
          ))}
        </div>
      )}
      <RadioGroup
        name="approval-decision"
        legend="Decision"
        options={[
          { value: 'APPROVED', label: 'Approve' },
          { value: 'REJECTED', label: 'Reject' },
        ]}
        value={decision}
        onValueChange={(value) =>
          setDecision(value as ApprovalDecisionDtoDecision)
        }
      />
      <Input
        aria-label="Approval reason"
        placeholder="Decision reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <Alert tone="info" title="Decision context">
        The selected approval is shown above before any decision is submitted.
      </Alert>
    </section>
  );
}

function describeApproval(item: Record<string, unknown>) {
  const customer = describeValue(item.customer ?? item.customerId);
  const status = describeValue(item.status);
  const reasonCode = describeValue(
    item.reasonCode ?? item.ruleCode ?? item.reason,
  );
  return `${customer} · ${status} · ${reasonCode}`;
}

function describeValue(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (record.fullName || record.id) {
      return String(record.fullName ?? record.id);
    }
    return JSON.stringify(record);
  }
  return String(value);
}

const statusRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-3)',
  flexWrap: 'wrap',
};
