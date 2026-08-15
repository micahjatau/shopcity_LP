'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  offlineSyncControllerEarnBatchV1,
  type OfflineEarnBatchRecordDto,
} from '../../../../lib/api/generated-client';
import { createApiRequest } from '../../../../lib/api/request';
import {
  deleteOfflineEarnRecord,
  listOfflineEarnRecords,
  subscribeOfflineQueue,
  type OfflineEarnRecord,
} from '../../../../lib/browser/offline-earn-queue';
import { Alert, Button, Input, Table } from '../../../../components/ui';
import { Money, StatusBadge } from '../../../../components/shopcity';

export default function CashierSyncPage() {
  const [records, setRecords] = useState<OfflineEarnRecord[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [message, setMessage] = useState('Loading offline queue…');
  const [busy, setBusy] = useState(false);

  const pendingRecords = useMemo(
    () => records.filter((record) => record.syncState !== 'confirmed'),
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

    if (pendingRecords.length === 0) {
      setMessage('No pending offline records to sync.');
      return;
    }

    setBusy(true);
    setMessage('Submitting offline batch…');

    const recordsDto: OfflineEarnBatchRecordDto[] = pendingRecords.map((record) => ({
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
                    tone={record.syncState === 'rejected' ? 'danger' : record.syncState === 'retry-required' ? 'warning' : record.syncState === 'confirmed' ? 'success' : 'neutral'}
                  />
                  {record.lastError ? <div style={{ fontSize: 'var(--sc-font-size-sm)' }}>{record.lastError}</div> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
        <StatusBadge label={`Pending: ${pendingRecords.length}`} tone="info" />
        <Button variant="ghost" onClick={() => void clearConfirmed()} disabled={!records.some((record) => record.syncState === 'confirmed')}>
          Clear confirmed
        </Button>
      </div>
    </section>
  );
}
