'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  offlineSyncControllerEarnBatchV1,
  type OfflineEarnBatchRecordDto,
  type OfflineSyncControllerEarnBatchV1200DataRecordsItem,
} from '../../../../lib/api/generated-client';
import { createApiRequest } from '../../../../lib/api/request';
import {
  deleteOfflineEarnRecord,
  listOfflineEarnRecords,
  subscribeOfflineQueue,
  updateOfflineEarnRecord,
  type OfflineEarnRecord,
} from '../../../../lib/browser/offline-earn-queue';
import { Alert, Button, Input, Table } from '../../../../components/ui';
import { Money, StatusBadge } from '../../../../components/shopcity';

export default function CashierSyncPage() {
  const [records, setRecords] = useState<OfflineEarnRecord[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [message, setMessage] = useState('Loading offline queue…');
  const [busy, setBusy] = useState(false);
  const [lastBatchResults, setLastBatchResults] = useState<
    OfflineSyncControllerEarnBatchV1200DataRecordsItem[]
  >([]);

  const queueableRecords = useMemo(
    () =>
      records.filter(
        (record) =>
          record.syncState === 'waiting-to-sync' || record.syncState === 'retry-required',
      ),
    [records],
  );

  const statusCounts = useMemo(
    () => ({
      waiting: records.filter((record) => record.syncState === 'waiting-to-sync').length,
      syncing: records.filter((record) => record.syncState === 'syncing').length,
      awaitingApproval: records.filter((record) => record.syncState === 'awaiting-approval').length,
      confirmed: records.filter((record) => record.syncState === 'confirmed').length,
      rejected: records.filter((record) => record.syncState === 'rejected').length,
      retryRequired: records.filter((record) => record.syncState === 'retry-required').length,
    }),
    [records],
  );

  async function refresh() {
    try {
      const next = await listOfflineEarnRecords();
      setRecords(next);
      setMessage(`Loaded ${next.length} local record(s).`);
    } catch {
      setMessage('Offline queue unavailable.');
    }
  }

  useEffect(() => {
    void refresh();
    return subscribeOfflineQueue(() => {
      void refresh();
    });
  }, []);

  async function syncBatch() {
    if (!deviceId.trim()) {
      setMessage('Enter a device ID before submitting the batch.');
      return;
    }

    if (queueableRecords.length === 0) {
      setMessage('No waiting or retryable offline records to sync.');
      return;
    }

    setBusy(true);
    setMessage('Submitting offline batch…');

    const recordsDto: OfflineEarnBatchRecordDto[] = queueableRecords.map((record) => ({
      localId: record.localId,
      idempotencyKey: record.idempotencyKey,
      cashierId: record.cashierId,
      branchId: record.branchId,
      cardBarcode: record.cardBarcode,
      receiptNumber: record.receiptNumber,
      receiptWeekStart: record.receiptWeekStart,
      purchaseAmountKobo: record.purchaseAmountKobo,
      occurredAtLocal: record.occurredAtLocal,
    }));

    try {
      const response = await offlineSyncControllerEarnBatchV1(
        { deviceId: deviceId.trim(), records: recordsDto },
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );

      if (response.status === 200) {
        const nextResults = response.data.data.records;
        setLastBatchResults(nextResults);
        await Promise.all(
          nextResults.map((result) =>
            updateOfflineEarnRecord(result.localId, (record) => ({
              ...record,
              syncState: mapSyncState(result.status),
              lastError:
                result.errorCode ??
                (result.status === 'RETRYABLE'
                  ? 'Retry required by backend'
                  : result.status === 'REJECTED'
                    ? 'Rejected by backend'
                    : null),
              serverTransactionId: result.transactionId,
              serverApprovalId: result.approvalId,
            })),
          ),
        );
        setMessage('Batch submitted. Review per-record results below.');
        await refresh();
        return;
      }

      setMessage(`Batch sync unavailable (${response.status}).`);
    } catch {
      setMessage('Batch sync unavailable.');
    } finally {
      setBusy(false);
    }
  }

  async function clearConfirmed() {
    await Promise.all(
      records
        .filter((record) => record.syncState === 'confirmed')
        .map((record) => deleteOfflineEarnRecord(record.localId)),
    );
    await refresh();
  }

  async function retryRecord(localId: string) {
    await updateOfflineEarnRecord(localId, (record) => ({
      ...record,
      syncState: 'waiting-to-sync',
      lastError: null,
    }));
    setMessage(`Requeued ${localId} for the next sync batch.`);
    await refresh();
  }

  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Sync queue</h1>
        <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>
          Review local offline earn records, then submit a batch for reconciliation.
        </p>
        <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
          <Link href="/cashier">Back to cashier</Link>
          <Link href="/cashier/customers">Open customers</Link>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 'var(--sc-spacing-3)' }}>
        <Input aria-label="Device ID" placeholder="Device ID" value={deviceId} onChange={(event) => setDeviceId(event.target.value)} />
        <Button onClick={() => void refresh()} variant="secondary">Refresh</Button>
        <Button onClick={() => void syncBatch()} loading={busy}>Submit batch</Button>
      </div>
      <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>{message}</p>

      <div style={{ display: 'flex', gap: 'var(--sc-spacing-2)', flexWrap: 'wrap' }}>
        <StatusBadge label={`Waiting ${statusCounts.waiting}`} tone="info" />
        <StatusBadge label={`Syncing ${statusCounts.syncing}`} tone="neutral" />
        <StatusBadge label={`Approval ${statusCounts.awaitingApproval}`} tone="warning" />
        <StatusBadge label={`Confirmed ${statusCounts.confirmed}`} tone="success" />
        <StatusBadge label={`Rejected ${statusCounts.rejected}`} tone="danger" />
        <StatusBadge label={`Retryable ${statusCounts.retryRequired}`} tone="warning" />
      </div>

      {records.length === 0 ? (
        <Alert tone="warning" title="No offline records">
          There are no local offline earn records to sync.
        </Alert>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Local ID</th>
              <th>Card</th>
              <th>Receipt</th>
              <th>Amount</th>
              <th>State</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.localId}>
                <td>{record.localId}</td>
                <td>{record.cardBarcode}</td>
                <td>{record.receiptNumber}</td>
                <td><Money amountKobo={record.purchaseAmountKobo} /></td>
                <td>
                  <StatusBadge
                    label={record.syncState}
                    tone={toneForState(record.syncState)}
                  />
                  {record.lastError ? <div style={{ fontSize: 'var(--sc-font-size-sm)' }}>{record.lastError}</div> : null}
                  {record.serverTransactionId || record.serverApprovalId ? (
                    <div style={{ fontSize: 'var(--sc-font-size-sm)' }}>
                      {record.serverTransactionId ? `Txn ${record.serverTransactionId}` : null}
                      {record.serverApprovalId ? ` Approval ${record.serverApprovalId}` : null}
                    </div>
                  ) : null}
                </td>
                <td>
                  {record.syncState === 'retry-required' ? (
                    <Button variant="ghost" onClick={() => void retryRecord(record.localId)}>
                      Retry now
                    </Button>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {lastBatchResults.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <th>Local ID</th>
              <th>Status</th>
              <th>Transaction</th>
              <th>Approval</th>
              <th>Credit</th>
              <th>Retryable</th>
            </tr>
          </thead>
          <tbody>
            {lastBatchResults.map((result) => (
              <tr key={result.localId}>
                <td>{result.localId}</td>
                <td><StatusBadge label={result.status} tone={toneForResult(result.status)} /></td>
                <td>{result.transactionId ?? '—'}</td>
                <td>{result.approvalId ?? '—'}</td>
                <td>{typeof result.creditEarnedKobo === 'number' ? <Money amountKobo={result.creditEarnedKobo} /> : '—'}</td>
                <td>{result.retryable ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : null}

      <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
        <StatusBadge label={`Queueable: ${queueableRecords.length}`} tone="info" />
        <Button variant="ghost" onClick={() => void clearConfirmed()} disabled={!records.some((record) => record.syncState === 'confirmed')}>
          Clear confirmed
        </Button>
      </div>
    </section>
  );
}

function mapSyncState(
  status: OfflineSyncControllerEarnBatchV1200DataRecordsItem['status'],
): OfflineEarnRecord['syncState'] {
  if (status === 'CONFIRMED') return 'confirmed';
  if (status === 'PENDING_APPROVAL') return 'awaiting-approval';
  if (status === 'REJECTED') return 'rejected';
  return 'retry-required';
}

function toneForState(state: OfflineEarnRecord['syncState']) {
  if (state === 'confirmed') return 'success';
  if (state === 'awaiting-approval') return 'warning';
  if (state === 'rejected') return 'danger';
  if (state === 'retry-required') return 'warning';
  if (state === 'syncing') return 'neutral';
  return 'info';
}

function toneForResult(
  status: OfflineSyncControllerEarnBatchV1200DataRecordsItem['status'],
) {
  if (status === 'CONFIRMED') return 'success';
  if (status === 'PENDING_APPROVAL') return 'warning';
  if (status === 'REJECTED') return 'danger';
  return 'warning';
}
