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
import { Alert, Button, Input, RadioGroup, Table } from '../ui';
import { StatusBadge, Money } from '../shopcity';

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
  amountKobo?: number;
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

const FRAUD_PAGE_SIZE = 5;

export function FraudFlagsPanel() {
  const [items, setItems] = useState<FraudFlagRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Loading fraud flags…');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decision, setDecision] = useState<FraudFlagDecision>(
    FraudFlagDecisionDtoDecision.ACKNOWLEDGED,
  );
  const [reason, setReason] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [responseData, setResponseData] = useState<Record<
    string,
    unknown
  > | null>(null);

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
        if (severityFilter !== 'ALL' && item.severity !== severityFilter)
          return false;
        if (
          branchFilter.trim() &&
          !(item.branchId ?? 'Tenant-wide')
            .toLowerCase()
            .includes(branchFilter.trim().toLowerCase())
        ) {
          return false;
        }
        return true;
      }),
    [branchFilter, items, severityFilter, statusFilter],
  );
  const selectedItem = useMemo(
    () => filteredItems.find((item) => item.id === selectedId) ?? null,
    [filteredItems, selectedId],
  );

  const openCount = filteredItems.filter((item) => item.status === 'OPEN').length;
  const highSeverityCount = filteredItems.filter(
    (item) => item.severity === 'HIGH',
  ).length;
  const pageItems = filteredItems.slice(
    pageIndex * FRAUD_PAGE_SIZE,
    pageIndex * FRAUD_PAGE_SIZE + FRAUD_PAGE_SIZE,
  );
  const selectedPreview = selectedItem
    ? [
        [
          'Subject',
          selectedItem.customer?.fullName ?? selectedItem.actorId ?? '—',
        ],
        ['Status', selectedItem.status ?? '—'],
        ['Severity', selectedItem.severity ?? 'LOW'],
        ['Rule code', selectedItem.ruleCode ?? '—'],
        ['Reason code', selectedItem.reasonCode ?? '—'],
        ['Branch', selectedItem.branchId ?? 'Tenant-wide'],
        ['Receipt', selectedItem.receipt?.id ?? '—'],
        ['Amount', selectedItem.amountKobo],
        ['Decision', decision],
        ['Decision reason', reason || 'Enter a decision reason'],
      ]
    : [];

  useEffect(() => {
    if (pageIndex * FRAUD_PAGE_SIZE >= filteredItems.length) {
      setPageIndex(0);
    }
  }, [filteredItems.length, pageIndex]);

  async function refresh() {
    setLoading(true);
    try {
      const response = await fraudControllerListFraudFlagsV1(
        { limit: '25', cursor: '' },
        createApiRequest({ csrf: true }),
      );
      if (response.status === 200) {
        const nextItems = response.data.data.items as FraudFlagRecord[];
        setItems(nextItems);
        setSelectedId(nextItems[0]?.id ?? null);
        setPageIndex(0);
        setResponseData(null);
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
    if (!selectedId || !reason.trim()) {
      setMessage('Enter an explicit decision reason before submitting.');
      return;
    }
    const response = await fraudControllerDecideFraudFlagV1(
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
    <section style={layoutGrid}>
      <div style={statusRow}>
        <StatusBadge label={`Loaded ${items.length}`} tone="info" />
        <StatusBadge label={`Open ${openCount}`} tone="warning" />
        <StatusBadge label={`High ${highSeverityCount}`} tone="danger" />
        <StatusBadge
          label={selectedItem ? 'Selected' : 'No selection'}
          tone="neutral"
        />
      </div>

      <div style={routeRow}>
        {routeLinks.map(([href, label]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
      </div>

      <div style={filterRow}>
        <Input
          aria-label="Fraud status filter"
          placeholder="Status filter"
          value={statusFilter}
          onChange={(event) => {
            setPageIndex(0);
            setStatusFilter(event.target.value.toUpperCase() || 'ALL');
          }}
        />
        <Input
          aria-label="Fraud severity filter"
          placeholder="Severity filter"
          value={severityFilter}
          onChange={(event) => {
            setPageIndex(0);
            setSeverityFilter(event.target.value.toUpperCase() || 'ALL');
          }}
        />
        <Input
          aria-label="Fraud branch filter"
          placeholder="Branch ID"
          value={branchFilter}
          onChange={(event) => {
            setPageIndex(0);
            setBranchFilter(event.target.value);
          }}
        />
      </div>

      <div style={toolbarRow}>
        <Button
          variant="secondary"
          onClick={() => void refresh()}
          loading={loading}
        >
          Refresh fraud flags
        </Button>
        <Button
          onClick={() => void handleDecision()}
          disabled={!selectedId || !reason.trim()}
        >
          Submit decision
        </Button>
      </div>

      <p style={mutedText}>{message}</p>

      {filteredItems.length === 0 ? (
        <Alert tone="warning" title="No fraud flags">
          No fraud review items matched the current filters.
        </Alert>
      ) : (
        <div style={listGrid}>
          <section style={cardStyle} aria-label="Fraud flag list">
            <h2 style={{ marginTop: 0 }}>Cases</h2>
            <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
              {pageItems.map((item) => {
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
                    <div style={listHeaderRow}>
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
                    <p style={listBodyText}>
                      {item.customer?.fullName ??
                        item.actorId ??
                        'Contract-shaped fraud event'}
                    </p>
                    <div style={chipRow}>
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
          </section>

          {selectedItem ? (
            <>
              <section style={cardStyle} aria-label="Selected fraud case">
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
                          'amountKobo',
                        ].includes(key),
                      )
                      .slice(0, 10)
                      .map(([key, value]) => (
                        <tr key={key}>
                          <th scope="row">{key}</th>
                          <td>{describeValue(value)}</td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
              </section>

              <section style={cardStyle} aria-label="Fraud decision preview">
                <Alert tone="warning" title="Decision preview">
                  Review the evidence above before the backend records a
                  resolution.
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
            </>
          ) : null}
        </div>
      )}

      <div style={toolbarRow}>
        <Button
          variant="secondary"
          onClick={() => setPageIndex((current) => Math.max(current - 1, 0))}
          disabled={pageIndex === 0}
        >
          Previous page
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            setPageIndex((current) =>
              (current + 1) * FRAUD_PAGE_SIZE >= filteredItems.length
                ? current
                : current + 1,
            )
          }
          disabled={(pageIndex + 1) * FRAUD_PAGE_SIZE >= filteredItems.length}
        >
          Next page
        </Button>
      </div>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Decision</h2>
        <RadioGroup
          name="fraud-decision"
          legend="Decision"
          options={
            decisionOptions as unknown as { value: string; label: string }[]
          }
          value={decision}
          onValueChange={(value) => setDecision(value as FraudFlagDecision)}
        />
        <Input
          aria-label="Fraud decision reason"
          placeholder="Decision reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <div style={statusRow}>
          <StatusBadge
            label={
              decision === FraudFlagDecisionDtoDecision.RESOLVED
                ? 'Resolve'
                : 'Acknowledge'
            }
            tone={
              decision === FraudFlagDecisionDtoDecision.RESOLVED
                ? 'success'
                : 'info'
            }
          />
          <StatusBadge
            label={reason.trim() ? 'Reason ready' : 'Reason required'}
            tone={reason.trim() ? 'success' : 'warning'}
          />
        </div>
        <Alert tone="info" title="Decision context">
          The selected fraud item above includes the branch, rule, and subject
          details.
        </Alert>
      </section>

      {responseData ? (
        <section style={cardStyle}>
          <Alert tone="success" title="Backend response">
            The backend returned a fraud decision result.
          </Alert>
          <Table>
            <tbody>
              {Object.entries(responseData)
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
      ) : null}
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
  const subject =
    item.customer?.fullName ?? item.actorId ?? item.ruleCode ?? 'Fraud flag';
  return `${subject} · ${item.severity ?? 'LOW'} · ${item.status ?? 'UNKNOWN'}`;
}

function describeValue(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return <Money amountKobo={value} />;
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

const layoutGrid: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-4)',
};

const listGrid: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-4)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
};

const cardStyle: CSSProperties = {
  background: 'var(--sc-color-neutral-0)',
  border: '1px solid var(--sc-color-semantic-border)',
  borderRadius: 'var(--sc-radius-lg)',
  padding: 'var(--sc-spacing-5)',
  boxShadow: 'var(--sc-shadow-level1)',
  display: 'grid',
  gap: 'var(--sc-spacing-4)',
};

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

const filterRow: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-3)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
};

const toolbarRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-3)',
  flexWrap: 'wrap',
};

const chipRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-2)',
  flexWrap: 'wrap',
  marginTop: 'var(--sc-spacing-2)',
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

const mutedText: CSSProperties = {
  margin: 0,
  color: 'var(--sc-color-semantic-textSecondary)',
};
