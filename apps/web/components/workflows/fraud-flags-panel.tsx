'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  FraudFlagDecisionDtoDecision,
  fraudControllerDecideFraudFlagV1,
  fraudControllerListFraudFlagsV1,
  type FraudFlagDecisionDtoDecision as FraudFlagDecision,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Alert, Button, RadioGroup, Table } from '../ui';
import { StatusBadge } from '../shopcity';

type FraudFlagRecord = Record<string, unknown> & {
  id?: string;
  status?: string;
  severity?: string;
  ruleCode?: string;
  reasonCode?: string;
  branchId?: string | null;
  actorId?: string | null;
  customer?: { fullName?: string };
  receipt?: { id?: string };
};

const decisionOptions = [
  { value: FraudFlagDecisionDtoDecision.ACKNOWLEDGED, label: 'Acknowledge' },
  { value: FraudFlagDecisionDtoDecision.RESOLVED, label: 'Resolve' },
] as const;

export function FraudFlagsPanel() {
  const [items, setItems] = useState<FraudFlagRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Loading fraud flags…');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decision, setDecision] = useState<FraudFlagDecision>(
    FraudFlagDecisionDtoDecision.ACKNOWLEDGED,
  );

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  async function refresh() {
    setLoading(true);
    try {
      const response = await fraudControllerListFraudFlagsV1(
        { limit: '3', cursor: '' },
        createApiRequest({ csrf: true }),
      );
      if (response.status === 200) {
        const nextItems = response.data.data.items as FraudFlagRecord[];
        setItems(nextItems);
        setSelectedId(nextItems[0]?.id ?? null);
        setMessage(`Loaded ${nextItems.length} fraud flags.`);
      } else {
        setMessage(`Fraud flags unavailable (${response.status}).`);
      }
    } catch {
      setMessage('Fraud flags unavailable.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleDecision() {
    if (!selectedId) return;
    await fraudControllerDecideFraudFlagV1(
      selectedId,
      {
        decision,
        reason:
          decision === FraudFlagDecisionDtoDecision.RESOLVED
            ? 'Resolved from supervisor shell'
            : 'Acknowledged from supervisor shell',
      },
      createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
    );
    setMessage(`Decision sent for ${selectedId}.`);
    void refresh();
  }

  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
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
          Refresh fraud flags
        </Button>
        <Button onClick={() => void handleDecision()} disabled={!selectedId}>
          Submit decision
        </Button>
      </div>

      <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>
        {message}
      </p>

      {items.length === 0 ? (
        <Alert tone="warning" title="No fraud flags">
          No fraud review items matched the current filters.
        </Alert>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
          {items.slice(0, 3).map((item) => {
            const selected = item.id === selectedId;
            return (
              <button
                key={
                  item.id ??
                  `${item.ruleCode ?? 'fraud'}-${item.customer?.fullName ?? 'item'}`
                }
                type="button"
                onClick={() => setSelectedId(item.id ?? null)}
                style={{
                  textAlign: 'left',
                  padding: 'var(--sc-spacing-4)',
                  borderRadius: 'var(--sc-radius-lg)',
                  border: `1px solid ${selected ? 'var(--sc-color-brand-600)' : 'var(--sc-color-semantic-border)'}`,
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
                  <strong>
                    {item.ruleCode ??
                      item.reasonCode ??
                      item.id ??
                      'Fraud flag'}
                  </strong>
                  <StatusBadge
                    label={item.status ?? 'UNKNOWN'}
                    tone={item.status === 'OPEN' ? 'warning' : 'neutral'}
                  />
                </div>
                <p
                  style={{
                    margin: 0,
                    color: 'var(--sc-color-semantic-textSecondary)',
                  }}
                >
                  {item.customer?.fullName ??
                    item.actorId ??
                    'Contract-shaped fraud event'}
                </p>
                <div
                  style={{
                    display: 'flex',
                    gap: 'var(--sc-spacing-2)',
                    flexWrap: 'wrap',
                    marginTop: 'var(--sc-spacing-2)',
                  }}
                >
                  <StatusBadge
                    label={item.severity ?? 'LOW'}
                    tone={severityTone(item.severity)}
                  />
                  <StatusBadge
                    label={item.branchId ?? 'Tenant-wide'}
                    tone="info"
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedItem ? (
        <Table>
          <tbody>
            {Object.entries(selectedItem)
              .slice(0, 5)
              .map(([key, value]) => (
                <tr key={key}>
                  <th scope="row">{key}</th>
                  <td>{describeValue(value)}</td>
                </tr>
              ))}
          </tbody>
        </Table>
      ) : null}

      <RadioGroup
        name="fraud-decision"
        legend="Decision"
        options={
          decisionOptions as unknown as { value: string; label: string }[]
        }
        value={decision}
        onValueChange={(value) => setDecision(value as FraudFlagDecision)}
      />
    </section>
  );
}

function severityTone(severity?: string) {
  if (severity === 'HIGH') return 'danger';
  if (severity === 'MEDIUM') return 'warning';
  if (severity === 'LOW') return 'success';
  return 'neutral';
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
  return JSON.stringify(value);
}
