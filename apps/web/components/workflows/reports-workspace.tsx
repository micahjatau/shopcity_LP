'use client';

import { useEffect, useMemo, useState } from 'react';
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
  const [exportMessage, setExportMessage] = useState('');

  const params = useMemo(
    () => ({
      branchId: branchId || undefined,
      timezone: timezone || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [branchId, from, timezone, to],
  );

  async function refresh() {
    try {
      if (report === 'pilot-operations-summary') {
        const response = await reportsControllerGetPilotOperationsSummaryV1(
          createApiRequest({ csrf: true }),
        );
        if (response.status === 200) {
          setSummary(response.data.data);
          setMessage('Pilot operations summary loaded.');
        } else {
          setMessage(`Reports unavailable (${response.status}).`);
        }
        return;
      }

      const response =
        report === 'liability-ageing'
          ? await reportsControllerListLiabilityAgeingV1(params as any, createApiRequest({ csrf: true }))
          : report === 'customer-performance'
            ? await reportsControllerListCustomerPerformanceV1(params as any, createApiRequest({ csrf: true }))
            : report === 'cashier-activity'
              ? await reportsControllerListCashierActivityV1(params as any, createApiRequest({ csrf: true }))
              : report === 'redemption-summary'
                ? await reportsControllerListRedemptionSummaryV1(params as any, createApiRequest({ csrf: true }))
                : report === 'sms-operations'
                  ? await reportsControllerListSmsOperationsV1(params as any, createApiRequest({ csrf: true }))
                  : report === 'audit-report'
                    ? await reportsControllerListAuditReportV1(params as any, createApiRequest({ csrf: true }))
                    : report === 'materialization-state'
                      ? await reportsControllerListMaterializationStateV1(params as any, createApiRequest({ csrf: true }))
                      : await reportsControllerListExecutiveSummaryV1(params as any, createApiRequest({ csrf: true }));

      if (response.status === 200) {
        setSummary(response.data.data);
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
        setExportMessage('Pilot summary is read-only and refreshes from live data.');
        return;
      }
      const response = await reportsControllerRefreshReportV1(
        report,
        params as any,
        createApiRequest({ csrf: true }),
      );
      setExportMessage(
        response.status === 202
          ? 'Refresh queued.'
          : `Refresh responded with ${response.status}.`,
      );
      await refresh();
    } catch {
      setExportMessage('Refresh unavailable.');
    }
  }

  async function exportReport() {
    try {
      if (report === 'pilot-operations-summary') {
        setExportMessage('Pilot summary does not support export in this workspace.');
        return;
      }
      const response = await reportsControllerExportReportV1(
        report,
        params as any,
        createApiRequest({ csrf: true }),
      );
      if (response.status === 200) {
        setExportMessage('Export ready from backend contract.');
      } else {
        setExportMessage(`Export unavailable (${response.status}).`);
      }
    } catch {
      setExportMessage('Export unavailable.');
    }
  }

  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
        <Select
          aria-label="Report"
          value={report}
          onChange={(event) => setReport(event.target.value as ReportKey)}
          options={reportOptions}
        />
        <div
          style={{
            display: 'grid',
            gap: 'var(--sc-spacing-3)',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          }}
        >
          <Input aria-label="Branch filter" placeholder="Branch ID" value={branchId} onChange={(event) => setBranchId(event.target.value)} />
          <Input aria-label="Timezone filter" placeholder="Timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
          <Input aria-label="From date" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <Input aria-label="To date" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
        <Button onClick={() => void refresh()}>{report === 'pilot-operations-summary' ? 'Reload summary' : 'Load report'}</Button>
        <Button variant="secondary" onClick={() => void refreshReport()} disabled={report === 'pilot-operations-summary'}>
          Refresh materialization
        </Button>
        <Button variant="ghost" onClick={() => void exportReport()} disabled={report === 'pilot-operations-summary'}>
          Export
        </Button>
      </div>
      <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>
        {message}
      </p>
      {exportMessage ? (
        <Alert tone="info" title="Report action">
          {exportMessage}
        </Alert>
      ) : null}
      {summary ? (
        <>
          <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
            <StatusBadge label={summary.scope ?? report} tone="info" />
            <StatusBadge label={(summary.branchId ?? branchId) || 'Tenant-wide'} tone="neutral" />
            <StatusBadge label={(summary.timezone ?? timezone) || 'Timezone pending'} tone="success" />
            {summary.materializationState ? (
              <StatusBadge label={summary.materializationState} tone="warning" />
            ) : null}
            {typeof summary.freshCount === 'number' ? <StatusBadge label={`Fresh ${summary.freshCount}`} tone="success" /> : null}
            {typeof summary.staleCount === 'number' ? <StatusBadge label={`Stale ${summary.staleCount}`} tone="warning" /> : null}
          </div>
          <Alert tone="info" title="Current filters">
            {describeReportContext(summary, report, branchId, timezone, from, to)}
          </Alert>
          {Array.isArray(summary.items) && summary.items.length > 0 ? (
            <Table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {summary.items.slice(0, 8).map((item: Record<string, unknown>, index: number) => {
                  const [label, value] = Object.entries(item)[0] ?? [`item-${index + 1}`, 'Unknown'];
                  return (
                    <tr key={`${label}-${index}`}>
                      <td>{label}</td>
                      <td>{String(value)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : (
            <Alert tone="warning" title="No report rows">
              The selected report returned no rows for the current filters.
            </Alert>
          )}
          {summary.reconciliation ? (
            <>
              <Alert tone={summary.reconciliation.unhealthy ? 'danger' : 'success'} title="Reconciliation">
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
                    {summary.reconciliation.items.slice(0, 5).map((item: Record<string, unknown>, index: number) => {
                      const [label, value] = Object.entries(item)[0] ?? [`recon-${index + 1}`, 'Unknown'];
                      return (
                        <tr key={`${label}-${index}`}>
                          <td>{label}</td>
                          <td>{String(value)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </section>
  );
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
    `window ${(from || 'start')} → ${(to || 'now')}`,
  ];
  return parts.join(' · ');
}
