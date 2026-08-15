'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  reportsControllerExportReportV1,
  reportsControllerGetPilotOperationsSummaryV1,
  reportsControllerListAuditReportV1,
  reportsControllerListCashierActivityV1,
  reportsControllerListCustomerPerformanceV1,
  reportsControllerListExecutiveSummaryV1,
  reportsControllerListLiabilityAgeingV1,
  reportsControllerListMaterializationStateV1,
  reportsControllerListRedemptionSummaryV1,
  reportsControllerListSmsOperationsV1,
  reportsControllerRefreshReportV1,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Alert, Button, Input, Select, Table } from '../ui';
import { StatusBadge } from '../shopcity';

type ReportKey =
  | 'executive-summary'
  | 'liability-ageing'
  | 'customer-performance'
  | 'cashier-activity'
  | 'redemption-summary'
  | 'sms-operations'
  | 'audit-report'
  | 'materialization-state'
  | 'pilot-operations-summary';

const reportOptions: Array<{ value: ReportKey; label: string }> = [
  { value: 'executive-summary', label: 'Executive summary' },
  { value: 'liability-ageing', label: 'Liability ageing' },
  { value: 'customer-performance', label: 'Customer performance' },
  { value: 'cashier-activity', label: 'Cashier activity' },
  { value: 'redemption-summary', label: 'Redemption summary' },
  { value: 'sms-operations', label: 'SMS operations' },
  { value: 'audit-report', label: 'Audit report' },
  { value: 'materialization-state', label: 'Materialization state' },
  { value: 'pilot-operations-summary', label: 'Pilot operations summary' },
];

export function ReportsWorkspace() {
  const [report, setReport] = useState<ReportKey>('executive-summary');
  const [branchId, setBranchId] = useState('');
  const [timezone, setTimezone] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [summary, setSummary] = useState<any | null>(null);
  const [message, setMessage] = useState('Loading report summary…');
  const [actionMessage, setActionMessage] = useState('');
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [actionResult, setActionResult] = useState<Record<
    string,
    unknown
  > | null>(null);

  const params = useMemo(
    () => ({
      branchId: branchId || undefined,
      timezone: timezone || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [branchId, from, timezone, to],
  );

  const items = Array.isArray(summary?.items)
    ? (summary.items as Record<string, unknown>[])
    : [];
  const selectedItem = items[selectedItemIndex] ?? null;

  useEffect(() => {
    if (selectedItemIndex >= items.length) {
      setSelectedItemIndex(0);
    }
  }, [items.length, selectedItemIndex]);

  async function refresh() {
    setActionMessage('');
    setActionResult(null);
    try {
      if (report === 'pilot-operations-summary') {
        const response = await reportsControllerGetPilotOperationsSummaryV1(
          createApiRequest({ csrf: true }),
        );
        if (response.status === 200) {
          setSummary(response.data.data);
          setSelectedItemIndex(0);
          setMessage('Pilot operations summary loaded.');
        } else {
          setMessage(`Reports unavailable (${response.status}).`);
        }
        return;
      }

      const response =
        report === 'liability-ageing'
          ? await reportsControllerListLiabilityAgeingV1(
              params as any,
              createApiRequest({ csrf: true }),
            )
          : report === 'customer-performance'
            ? await reportsControllerListCustomerPerformanceV1(
                params as any,
                createApiRequest({ csrf: true }),
              )
            : report === 'cashier-activity'
              ? await reportsControllerListCashierActivityV1(
                  params as any,
                  createApiRequest({ csrf: true }),
                )
              : report === 'redemption-summary'
                ? await reportsControllerListRedemptionSummaryV1(
                    params as any,
                    createApiRequest({ csrf: true }),
                  )
                : report === 'sms-operations'
                  ? await reportsControllerListSmsOperationsV1(
                      params as any,
                      createApiRequest({ csrf: true }),
                    )
                  : report === 'audit-report'
                    ? await reportsControllerListAuditReportV1(
                        params as any,
                        createApiRequest({ csrf: true }),
                      )
                    : report === 'materialization-state'
                      ? await reportsControllerListMaterializationStateV1(
                          params as any,
                          createApiRequest({ csrf: true }),
                        )
                      : await reportsControllerListExecutiveSummaryV1(
                          params as any,
                          createApiRequest({ csrf: true }),
                        );

      if (response.status === 200) {
        setSummary(response.data.data);
        setSelectedItemIndex(0);
        setMessage(`Report summary loaded for ${report}.`);
      } else {
        setMessage(`Reports unavailable (${response.status}).`);
      }
    } catch {
      setMessage('Reports unavailable.');
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report]);

  async function refreshReport() {
    try {
      if (report === 'pilot-operations-summary') {
        setActionMessage(
          'Pilot summary is read-only and refreshes from live data.',
        );
        return;
      }
      const response = await reportsControllerRefreshReportV1(
        report,
        params as any,
        createApiRequest({ csrf: true }),
      );
      setActionResult(
        response.data && typeof response.data === 'object'
          ? (response.data as Record<string, unknown>)
          : null,
      );
      setActionMessage(
        response.status === 202
          ? 'Refresh queued.'
          : `Refresh responded with ${response.status}.`,
      );
      await refresh();
    } catch {
      setActionMessage('Refresh unavailable.');
    }
  }

  async function exportReport() {
    try {
      if (report === 'pilot-operations-summary') {
        setActionMessage(
          'Pilot summary does not support export in this workspace.',
        );
        return;
      }
      const response = await reportsControllerExportReportV1(
        report,
        params as any,
        createApiRequest({ csrf: true }),
      );
      setActionResult(
        response.data && typeof response.data === 'object'
          ? (response.data as Record<string, unknown>)
          : null,
      );
      if (response.status === 200) {
        setActionMessage('Export ready from backend contract.');
      } else {
        setActionMessage(`Export unavailable (${response.status}).`);
      }
    } catch {
      setActionMessage('Export unavailable.');
    }
  }

  const selectedSummary = summary
    ? describeReportContext(summary, report, branchId, timezone, from, to)
    : 'No report loaded yet.';

  return (
    <section style={workspaceGrid}>
      <section style={cardStyle} aria-label="Report controls">
        <div style={toolbarRow}>
          <StatusBadge label={summary?.scope ?? report} tone="info" />
          <StatusBadge
            label={(summary?.branchId ?? branchId) || 'Tenant-wide'}
            tone="neutral"
          />
          <StatusBadge
            label={(summary?.timezone ?? timezone) || 'Timezone pending'}
            tone="success"
          />
          {summary?.materializationState ? (
            <StatusBadge label={summary.materializationState} tone="warning" />
          ) : null}
          {typeof summary?.freshCount === 'number' ? (
            <StatusBadge label={`Fresh ${summary.freshCount}`} tone="success" />
          ) : null}
          {typeof summary?.staleCount === 'number' ? (
            <StatusBadge label={`Stale ${summary.staleCount}`} tone="warning" />
          ) : null}
        </div>

        <Select
          aria-label="Report"
          value={report}
          onChange={(event) => setReport(event.target.value as ReportKey)}
          options={reportOptions}
        />
        <div style={filterGrid}>
          <Input
            aria-label="Branch filter"
            placeholder="Branch ID"
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
          />
          <Input
            aria-label="Timezone filter"
            placeholder="Timezone"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
          />
          <Input
            aria-label="From date"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
          <Input
            aria-label="To date"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
        <div style={toolbarRow}>
          <Button onClick={() => void refresh()}>
            {report === 'pilot-operations-summary'
              ? 'Reload summary'
              : 'Load report'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void refreshReport()}
            disabled={report === 'pilot-operations-summary'}
          >
            Refresh materialization
          </Button>
          <Button
            variant="ghost"
            onClick={() => void exportReport()}
            disabled={report === 'pilot-operations-summary'}
          >
            Export
          </Button>
        </div>
      </section>

      <section style={cardStyle} aria-label="Report status">
        <h2 style={{ marginTop: 0 }}>Current report</h2>
        <p style={mutedText}>{message}</p>
        {actionMessage ? (
          <Alert tone="info" title="Report action">
            {actionMessage}
          </Alert>
        ) : null}
        <Alert tone="info" title="Current filters">
          {selectedSummary}
        </Alert>
        {actionResult ? (
          <Table>
            <tbody>
              {Object.entries(actionResult)
                .slice(0, 8)
                .map(([key, value]) => (
                  <tr key={key}>
                    <th scope="row">{key}</th>
                    <td>{renderValue(value)}</td>
                  </tr>
                ))}
            </tbody>
          </Table>
        ) : null}
      </section>

      <div style={workspaceGrid}>
        <section style={cardStyle} aria-label="Report summary items">
          <h2 style={{ marginTop: 0 }}>Summary items</h2>
          {items.length > 0 ? (
            <div style={itemsGrid}>
              {items.slice(0, 6).map((item, index) => {
                const entries = Object.entries(item);
                const [label, value] = entries[0] ?? [
                  `item-${index + 1}`,
                  'Unknown',
                ];
                const selected = index === selectedItemIndex;
                return (
                  <button
                    key={`${label}-${index}`}
                    type="button"
                    onClick={() => setSelectedItemIndex(index)}
                    style={{
                      textAlign: 'left',
                      padding: 'var(--sc-spacing-4)',
                      borderRadius: 'var(--sc-radius-lg)',
                      border: `1px solid ${selected ? 'var(--sc-color-brand-600)' : 'var(--sc-color-semantic-border)'}`,
                      background: 'var(--sc-color-neutral-0)',
                    }}
                  >
                    <div style={listHeaderRow}>
                      <strong>{label}</strong>
                      <StatusBadge
                        label={selected ? 'Selected' : 'Item'}
                        tone={selected ? 'success' : 'neutral'}
                      />
                    </div>
                    <p style={listBodyText}>{renderValue(value)}</p>
                    <div style={chipRow}>
                      <StatusBadge label={report} tone="info" />
                      <StatusBadge
                        label={branchId || 'Tenant-wide'}
                        tone="neutral"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <Alert tone="warning" title="No report rows">
              The selected report returned no rows for the current filters.
            </Alert>
          )}
        </section>

        <section style={cardStyle} aria-label="Selected report item">
          <h2 style={{ marginTop: 0 }}>Selected item</h2>
          {selectedItem ? (
            <>
              <Alert tone="info" title="Item context">
                {describeSelectedItem(selectedItem)}
              </Alert>
              <Table>
                <tbody>
                  {Object.entries(selectedItem)
                    .slice(0, 10)
                    .map(([key, value]) => (
                      <tr key={key}>
                        <th scope="row">{key}</th>
                        <td>{renderValue(value)}</td>
                      </tr>
                    ))}
                </tbody>
              </Table>
            </>
          ) : (
            <Alert tone="warning" title="No item selected">
              Select a summary row to inspect its full values.
            </Alert>
          )}
        </section>
      </div>

      {summary?.reconciliation ? (
        <section style={cardStyle} aria-label="Reconciliation">
          <Alert
            tone={summary.reconciliation.unhealthy ? 'danger' : 'success'}
            title="Reconciliation"
          >
            {JSON.stringify(summary.reconciliation)}
          </Alert>
          {Array.isArray(summary.reconciliation.items) ? (
            <Table>
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {summary.reconciliation.items
                  .slice(0, 5)
                  .map((item: Record<string, unknown>, index: number) => {
                    const [label, value] = Object.entries(item)[0] ?? [
                      `recon-${index + 1}`,
                      'Unknown',
                    ];
                    return (
                      <tr key={`${label}-${index}`}>
                        <td>{label}</td>
                        <td>{renderValue(value)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </Table>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}

function renderValue(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string' || typeof value === 'boolean')
    return String(value);
  return JSON.stringify(value);
}

function describeSelectedItem(item: Record<string, unknown>) {
  const label = Object.entries(item)[0]?.[0] ?? 'item';
  const value = Object.entries(item)[0]?.[1];
  return `${label}: ${renderValue(value)}`;
}

function describeReportContext(
  summary: any,
  report: ReportKey,
  branchId: string,
  timezone: string,
  from: string,
  to: string,
) {
  const parts = [
    `Report ${summary.scope ?? report}`,
    `branch ${(summary.branchId ?? branchId) || 'Tenant-wide'}`,
    `timezone ${(summary.timezone ?? timezone) || 'pending'}`,
    `window ${from || 'start'} → ${to || 'now'}`,
  ];
  return parts.join(' · ');
}

const workspaceGrid: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-4)',
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

const toolbarRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-3)',
  flexWrap: 'wrap',
};

const filterGrid: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-3)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
};

const itemsGrid: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-3)',
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
