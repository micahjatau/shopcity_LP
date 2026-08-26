'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useSessionBootstrapState } from '../../../../components/session-bootstrap';
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
  const [selectedLocalId, setSelectedLocalId] = useState<string | null>(null);
  const [clearConfirmation, setClearConfirmation] = useState('');
  const [actionResponse, setActionResponse] = useState<Record<
    string,
    unknown
  > | null>(null);
  const { deviceId: sessionDeviceId } = useSessionBootstrapState();

  const selectedRecord = useMemo(
    () => records.find((record) => record.localId === selectedLocalId) ?? null,
    [records, selectedLocalId],
  );

  const queueableRecords = useMemo(
    () =>
      records.filter(
        (record) =>
          record.syncState === 'waiting-to-sync' ||
          record.syncState === 'retry-required' ||
          record.syncState === 'saved-on-device',
      ),
    [records],
  );

  const statusCounts = useMemo(
    () => ({
      waiting: records.filter(
        (record) => record.syncState === 'waiting-to-sync',
      ).length,
      syncing: records.filter((record) => record.syncState === 'syncing')
        .length,
      awaitingApproval: records.filter(
        (record) => record.syncState === 'awaiting-approval',
      ).length,
      confirmed: records.filter((record) => record.syncState === 'confirmed')
        .length,
      rejected: records.filter((record) => record.syncState === 'rejected')
        .length,
      retryRequired: records.filter(
        (record) => record.syncState === 'retry-required',
      ).length,
    }),
    [records],
  );

  const selectedPreview = selectedRecord
    ? [
        ['Local ID', selectedRecord.localId],
        ['Card', selectedRecord.cardBarcode ?? '—'],
        ['Receipt', selectedRecord.receiptNumber ?? '—'],
        ['State', selectedRecord.syncState],
        ['Server transaction', selectedRecord.serverTransactionId ?? '—'],
        ['Server approval', selectedRecord.serverApprovalId ?? '—'],
        ['Device', deviceId || 'Authenticated device unavailable'],
        ['Last error', selectedRecord.lastError ?? '—'],
      ]
    : [];

  async function refresh() {
    try {
      const next = await listOfflineEarnRecords();
      setRecords(next);
      setSelectedLocalId((current) => current ?? next[0]?.localId ?? null);
      setMessage(`Loaded ${next.length} local record(s).`);
      setActionResponse(null);
    } catch {
      setMessage('Offline queue unavailable.');
    }
  }

  useEffect(() => {
    setDeviceId(sessionDeviceId ?? '');

    void refresh();
    return subscribeOfflineQueue(() => {
      void refresh();
    });
  }, [sessionDeviceId]);

  async function syncBatch() {
    if (!deviceId.trim()) {
      setMessage(
        'Authenticated device ID is unavailable. Reconnect the session.',
      );
      return;
    }

    if (queueableRecords.length === 0) {
      setMessage('No waiting, saved, or retryable offline records to sync.');
      return;
    }

    setBusy(true);
    setMessage('Submitting offline batch…');

    const recordsDto: OfflineEarnBatchRecordDto[] = queueableRecords.map(
      (record) => ({
        localId: record.localId,
        idempotencyKey: record.idempotencyKey,
        cashierId: record.cashierId,
        branchId: record.branchId,
        cardBarcode: record.cardBarcode,
        receiptNumber: record.receiptNumber,
        receiptWeekStart: record.receiptWeekStart,
        purchaseAmountKobo: record.purchaseAmountKobo,
        occurredAtLocal: record.occurredAtLocal,
      }),
    );

    try {
      const response = await offlineSyncControllerEarnBatchV1(
        { deviceId: deviceId.trim(), records: recordsDto },
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      setActionResponse(
        response.data && typeof response.data === 'object'
          ? response.data
          : null,
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
        await refresh();
        setMessage('Batch submitted. Review per-record results below.');
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
    if (clearConfirmation.trim().toUpperCase() !== 'CLEAR') {
      setMessage('Type CLEAR to remove confirmed records.');
      return;
    }

    await Promise.all(
      records
        .filter((record) => record.syncState === 'confirmed')
        .map((record) => deleteOfflineEarnRecord(record.localId)),
    );
    setActionResponse(null);
    setClearConfirmation('');
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
    <section style={layoutGrid}>
      <header style={headerGrid}>
        <h1 style={{ margin: 0 }}>Sync queue</h1>
        <p
          style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}
        >
          Review local offline earn records, then submit a batch for
          reconciliation.
        </p>
        <p
          style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}
        >
          Queue recovery stays in this route.
        </p>
      </header>

      <Alert tone="info" title="Sync route context">
        This queue view is for local offline earn records, batch reconciliation,
        and retry cleanup.
      </Alert>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Batch controls</h2>
        <div style={controlRow}>
          <Input
            aria-label="Device ID"
            placeholder="Authenticated device"
            value={deviceId}
            readOnly
          />
          <Button onClick={() => void refresh()} variant="secondary">
            Refresh
          </Button>
          <Button onClick={() => void syncBatch()} loading={busy}>
            Submit batch
          </Button>
        </div>
        <p style={muted}>{message}</p>
        <p style={muted}>
          Device ID: {deviceId || 'Unavailable until device-bound login'}
        </p>
        <p style={muted}>
          Batchable records will be sent in a single backend reconciliation
          request.
        </p>
      </section>

      <div style={statusRow}>
        <StatusBadge label={`Waiting ${statusCounts.waiting}`} tone="info" />
        <StatusBadge label={`Syncing ${statusCounts.syncing}`} tone="neutral" />
        <StatusBadge
          label={`Approval ${statusCounts.awaitingApproval}`}
          tone="warning"
        />
        <StatusBadge
          label={`Confirmed ${statusCounts.confirmed}`}
          tone="success"
        />
        <StatusBadge
          label={`Rejected ${statusCounts.rejected}`}
          tone="danger"
        />
        <StatusBadge
          label={`Retryable ${statusCounts.retryRequired}`}
          tone="warning"
        />
      </div>

      <p style={muted}>
        Queue summary above stays aligned with the selected record and batch
        result panels below.
      </p>

      {selectedRecord ? (
        <Alert tone="info" title="Selected record">
          {selectedRecord.localId} ·{' '}
          {selectedRecord.cardBarcode ?? 'Card pending'} ·{' '}
          {selectedRecord.syncState}
        </Alert>
      ) : null}

      <div style={priorityGrid}>
        <section style={highlightCardStyle}>
          <h2 style={{ marginTop: 0 }}>Selected details</h2>
          {selectedRecord ? (
            <>
              <p style={muted}>
                This card stays ahead of the queue so the active record is
                always obvious.
              </p>
              <Table>
                <tbody>
                  {selectedPreview.map(([key, value]) => (
                    <tr key={key}>
                      <th scope="row">{key}</th>
                      <td>{renderValue(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          ) : (
            <Alert tone="warning" title="No selected record">
              Pick a queue entry to inspect its local metadata.
            </Alert>
          )}
        </section>

        <section style={highlightCardStyle}>
          <h2 style={{ marginTop: 0 }}>Backend response</h2>
          <p style={muted}>
            {actionResponse
              ? 'The latest backend payload and batch outcomes are visible here.'
              : 'Submit a batch to inspect the backend response and reconciliation results.'}
          </p>
          {actionResponse ? (
            <Table>
              <tbody>
                {Object.entries(actionResponse)
                  .slice(0, 8)
                  .map(([key, value]) => (
                    <tr key={key}>
                      <th scope="row">{key}</th>
                      <td>{renderValue(value)}</td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          ) : (
            <Alert tone="warning" title="No backend response">
              Sync a batch to surface the response payload.
            </Alert>
          )}
          <div style={statusRow}>
            <StatusBadge
              label={`Batch results ${lastBatchResults.length}`}
              tone="info"
            />
            <StatusBadge
              label={`Queueable ${queueableRecords.length}`}
              tone="neutral"
            />
          </div>
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
                    <td>
                      <StatusBadge
                        label={result.status}
                        tone={toneForResult(result.status)}
                      />
                    </td>
                    <td>{result.transactionId ?? '—'}</td>
                    <td>{result.approvalId ?? '—'}</td>
                    <td>
                      {typeof result.creditEarnedKobo === 'number' ? (
                        <Money amountKobo={result.creditEarnedKobo} />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{result.retryable ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
          <div style={toolbarRow}>
            <Input
              aria-label="Clear confirmation"
              placeholder="Type CLEAR to remove confirmed"
              value={clearConfirmation}
              onChange={(event) => setClearConfirmation(event.target.value)}
            />
            <Button
              variant="ghost"
              onClick={() => void clearConfirmed()}
              disabled={
                !records.some((record) => record.syncState === 'confirmed')
              }
            >
              Clear confirmed
            </Button>
          </div>
        </section>
      </div>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Queue</h2>
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
                  <td>
                    <button
                      type="button"
                      onClick={() => setSelectedLocalId(record.localId)}
                      style={rowButton}
                    >
                      {record.localId}
                    </button>
                  </td>
                  <td>{record.cardBarcode}</td>
                  <td>{record.receiptNumber}</td>
                  <td>
                    <Money amountKobo={record.purchaseAmountKobo} />
                  </td>
                  <td>
                    <StatusBadge
                      label={record.syncState}
                      tone={toneForState(record.syncState)}
                    />
                    {record.lastError ? (
                      <div style={smallText}>{record.lastError}</div>
                    ) : null}
                    {record.serverTransactionId || record.serverApprovalId ? (
                      <div style={smallText}>
                        {record.serverTransactionId
                          ? `Txn ${record.serverTransactionId}`
                          : null}
                        {record.serverApprovalId
                          ? ` Approval ${record.serverApprovalId}`
                          : null}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {record.syncState === 'retry-required' ? (
                      <Button
                        variant="ghost"
                        onClick={() => void retryRecord(record.localId)}
                      >
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
      </section>
    </section>
  );
}

function renderValue(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
    return String(value);
  return JSON.stringify(value, null, 2);
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
  if (state === 'saved-on-device') return 'info';
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

const layoutGrid: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-4)',
};

const headerGrid: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-2)',
};

const cardStyle: CSSProperties = {
  border: '1px solid var(--sc-color-semantic-border)',
  borderRadius: 'var(--sc-radius-lg)',
  padding: 'var(--sc-spacing-5)',
  background: 'var(--sc-color-neutral-0)',
  display: 'grid',
  gap: 'var(--sc-spacing-4)',
};

const muted: CSSProperties = {
  color: 'var(--sc-color-semantic-textSecondary)',
  marginBottom: 0,
};

const smallText: CSSProperties = {
  fontSize: 'var(--sc-font-size-sm)',
};

const rowButton: CSSProperties = {
  padding: 0,
  border: 0,
  background: 'transparent',
  cursor: 'pointer',
  font: 'inherit',
  textAlign: 'left',
};

const routeRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-3)',
  flexWrap: 'wrap',
};

const statusRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-3)',
  flexWrap: 'wrap',
};

const priorityGrid: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-4)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
};

const highlightCardStyle: CSSProperties = {
  ...cardStyle,
  borderColor: 'var(--sc-color-brand-300)',
  boxShadow: 'var(--sc-shadow-level2)',
};

const controlRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto auto',
  gap: 'var(--sc-spacing-3)',
};

const toolbarRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-3)',
  flexWrap: 'wrap',
  alignItems: 'center',
};
