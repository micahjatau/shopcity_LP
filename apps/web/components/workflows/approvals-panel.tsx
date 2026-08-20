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
  const [responseData, setResponseData] = useState<Record<
    string,
    unknown
  > | null>(null);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const pendingCount = items.filter((item) => item.status === 'PENDING').length;
  const selectedPreview = selectedItem
    ? [
        [
          'Customer',
          selectedItem.customer?.fullName ?? selectedItem.customerId ?? '—',
        ],
        ['Status', selectedItem.status ?? '—'],
        [
          'Reason code',
          selectedItem.reasonCode ?? selectedItem.ruleCode ?? '—',
        ],
        ['Branch', selectedItem.branchId ?? '—'],
        ['Receipt', selectedItem.receipt ?? '—'],
        ['Amount', selectedItem.amountKobo],
        ['Decision', decision],
        ['Decision reason', reason || 'Enter a decision reason'],
      ]
    : [];

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
        setSelectedId(
          (nextItems[0] as { id?: string } | undefined)?.id ?? null,
        );
        setResponseData(null);
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
    if (!selectedId || !reason.trim()) {
      setMessage('Enter an explicit decision reason before submitting.');
      return;
    }
    const response = await approvalsControllerDecideApprovalV1(
      selectedId,
      {
        decision,
        reason: reason.trim(),
      },
      createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
    );
    setResponseData(
      response.data && typeof response.data === 'object'
        ? (response.data as Record<string, unknown>)
        : null,
    );
    setMessage(`Decision sent for ${selectedId}.`);
    void refresh();
  }

  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <h2 style={{ margin: 0 }}>Approvals panel</h2>
      <div style={statusRow}>
        <StatusBadge label={`Loaded ${items.length}`} tone="info" />
        <StatusBadge label={`Pending ${pendingCount}`} tone="warning" />
        <StatusBadge
          label={selectedItem ? 'Selected' : 'No selection'}
          tone="neutral"
        />
        {selectedItem ? (
          <StatusBadge
            label={selectedItem.status ?? 'Unknown'}
            tone={selectedItem.status === 'PENDING' ? 'warning' : 'neutral'}
          />
        ) : null}
      </div>

      <div style={toolbarRow}>
        <Button
          variant="secondary"
          onClick={() => void refresh()}
          loading={loading}
        >
          Refresh approvals
        </Button>
        <Button
          onClick={() => void handleDecision()}
          disabled={!selectedId || !reason.trim()}
        >
          Submit decision
        </Button>
      </div>

      <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>
        {message}
      </p>

      {selectedItem ? (
        <div style={workspaceGrid}>
          <section style={cardStyle}>
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
          </section>
          <section style={cardStyle}>
            <Alert tone="warning" title="Decision preview">
              The selected approval is reviewed before the backend records the
              final decision.
            </Alert>
            <Table>
              <tbody>
                {selectedPreview.map(([key, value]) => (
                  <tr key={key}>
                    <th scope="row">{key}</th>
                    <td>{describeValue(value)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </section>
        </div>
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
              <div style={listHeaderRow}>
                <strong>{item.customer?.fullName ?? item.id}</strong>
                <StatusBadge
                  label={item.status}
                  tone={item.status === 'PENDING' ? 'warning' : 'neutral'}
                />
              </div>
              <p style={listBodyText}>{item.reasonCode ?? 'No reason code'}</p>
              <div style={listMetaRow}>
                <span>
                  {describeValue(item.receipt ?? item.referenceNumber ?? '—')}
                </span>
                <span>{describeValue(item.amountKobo)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <section style={cardStyle}>
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
        <div style={statusRow}>
          <StatusBadge
            label={decision === 'APPROVED' ? 'Approve' : 'Reject'}
            tone={decision === 'APPROVED' ? 'success' : 'danger'}
          />
          <StatusBadge
            label={reason.trim() ? 'Reason ready' : 'Reason required'}
            tone={reason.trim() ? 'info' : 'warning'}
          />
        </div>
        <Alert tone="info" title="Decision context">
          The selected approval is shown above before any decision is submitted.
        </Alert>
      </section>

      {responseData ? (
        <section style={cardStyle}>
          <Alert tone="success" title="Backend response">
            The backend returned a decision result.
          </Alert>
          <Table>
            <tbody>
              {Object.entries(responseData)
                .slice(0, 6)
                .map(([key, value]) => (
                  <tr key={key}>
                    <th scope="row">{key}</th>
                    <td>{describeValue(value)}</td>
                  </tr>
                ))}
            </tbody>
          </Table>
        </section>
      ) : null}
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

const cardStyle: CSSProperties = {
  background: 'var(--sc-color-neutral-0)',
  border: '1px solid var(--sc-color-semantic-border)',
  borderRadius: 'var(--sc-radius-lg)',
  padding: 'var(--sc-spacing-5)',
  boxShadow: 'var(--sc-shadow-level1)',
  display: 'grid',
  gap: 'var(--sc-spacing-4)',
};

const workspaceGrid: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-4)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
};

const toolbarRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-3)',
  flexWrap: 'wrap',
};

const statusRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-3)',
  flexWrap: 'wrap',
};

const listHeaderRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 'var(--sc-spacing-3)',
};

const listBodyText: CSSProperties = {
  margin: 0,
  color: 'var(--sc-color-semantic-textSecondary)',
};

const listMetaRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 'var(--sc-spacing-3)',
  marginTop: 'var(--sc-spacing-2)',
  color: 'var(--sc-color-semantic-textSecondary)',
};
