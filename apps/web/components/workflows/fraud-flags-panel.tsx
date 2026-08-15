'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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

const routeLinks = [
  ['/supervisor', 'Supervisor'],
  ['/supervisor/transactions', 'Transactions'],
  ['/supervisor/approvals', 'Approvals'],
  ['/supervisor/reports', 'Reports'],
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

  const openCount = items.filter((item) => item.status === 'OPEN').length;
  const highSeverityCount = items.filter((item) => item.severity === 'HIGH').length;

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
            ? 'Resolved from supervisor fraud route'
            : 'Acknowledged from supervisor fraud route',
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
        <StatusBadge label={`Open ${openCount}`} tone="warning" />
        <StatusBadge label={`High ${highSeverityCount}`} tone="danger" />
      </div>
      <div style={routeRow}>
        {routeLinks.map(([href, label]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
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
        <>
          <Alert tone="info" title="Selected fraud flag">
            {describeFraudItem(selectedItem)}
          </Alert>
          <Table>
            <tbody>
              {Object.entries(selectedItem)
                .filter(([key]) =>
                  [
                    'id',
                    'status',
                    'severity',
                    'ruleCode',
                    'reasonCode',
                    'branchId',
                    'actorId',
                    'customer',
                    'receipt',
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

      <RadioGroup
        name="fraud-decision"
        legend="Decision"
        options={
          decisionOptions as unknown as { value: string; label: string }[]
        }
        value={decision}
        onValueChange={(value) => setDecision(value as FraudFlagDecision)}
      />
      <Alert tone="info" title="Decision context">
        The selected fraud item above includes the branch, rule, and subject details.
      </Alert>
    </section>
  );
}

function severityTone(severity?: string) {
  if (severity === 'HIGH') return 'danger';
  if (severity === 'MEDIUM') return 'warning';
  if (severity === 'LOW') return 'success';
  return 'neutral';
}

function describeFraudItem(item: FraudFlagRecord) {
  const subject = item.customer?.fullName ?? item.actorId ?? item.ruleCode ?? 'Fraud flag';
  return `${subject} · ${item.severity ?? 'LOW'} · ${item.status ?? 'UNKNOWN'}`;
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

const routeRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-3)',
  flexWrap: 'wrap',
};
