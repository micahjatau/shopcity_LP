'use client';

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
import { Alert, Button, Input, Select, Table } from '../../../../components/ui';
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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

  const statusBuckets = useMemo(
    () => ({
      waiting:
        statusCounts.waiting +
        records.filter((record) => record.syncState === 'saved-on-device')
          .length,
      syncing: statusCounts.syncing,
      needsAttention:
        statusCounts.awaitingApproval +
        statusCounts.rejected +
        statusCounts.retryRequired,
      synced: statusCounts.confirmed,
    }),
    [records, statusCounts],
  );

  const filteredRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesSearch =
        !normalizedSearch ||
        [record.localId, record.cardBarcode, record.receiptNumber]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedSearch));
      const matchesStatus = !statusFilter || record.syncState === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [records, search, statusFilter]);

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

    const syncingWrites = await Promise.all(
      queueableRecords.map((record) =>
        updateOfflineEarnRecord(record.localId, (current) => ({
          ...current,
          syncState: 'syncing',
          lastError: null,
        })),
      ),
    );
    const syncingFailure = syncingWrites.find((result) => !result.ok);
    if (syncingFailure && !syncingFailure.ok) {
      setBusy(false);
      setMessage(`Could not mark records as syncing: ${syncingFailure.error}`);
      await refresh();
      return;
    }

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

    const markBatchUnavailable = async (message: string) => {
      const retryWrites = await Promise.all(
        queueableRecords.map((record) =>
          updateOfflineEarnRecord(record.localId, (current) => ({
            ...current,
            syncState: 'retry-required',
            lastError: message,
          })),
        ),
      );
      const retryFailure = retryWrites.find((result) => !result.ok);
      await refresh();
      setMessage(
        retryFailure && !retryFailure.ok
          ? `${message} Local retry state could not be saved: ${retryFailure.error}`
          : message,
      );
    };

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
        const resultWrites = await Promise.all(
          nextResults.map((result) =>
            updateOfflineEarnRecord(result.localId, (record) => ({
              ...record,
              syncState: mapSyncState(result.status),
              lastError:
                result.errorCode ??
                (result.status === 'RETRYABLE'
                  ? 'Retry required'
                  : result.status === 'REJECTED'
                    ? 'Rejected'
                    : null),
              serverTransactionId: result.transactionId,
              serverApprovalId: result.approvalId,
            })),
          ),
        );
        const resultFailure = resultWrites.find((result) => !result.ok);
        await refresh();
        setMessage(
          resultFailure && !resultFailure.ok
            ? `Batch completed, but local result storage failed: ${resultFailure.error}`
            : 'Batch submitted. Review per-record results below.',
        );
        return;
      }

      await markBatchUnavailable(
        `Batch sync unavailable (${response.status}).`,
      );
    } catch {
      await markBatchUnavailable('Batch sync unavailable.');
    } finally {
      setBusy(false);
    }
  }

  async function clearConfirmed() {
    if (clearConfirmation.trim().toUpperCase() !== 'CLEAR') {
      setMessage('Type CLEAR to remove confirmed records.');
      return;
    }

    const deleteResults = await Promise.all(
      records
        .filter((record) => record.syncState === 'confirmed')
        .map((record) => deleteOfflineEarnRecord(record.localId)),
    );
    const deleteFailure = deleteResults.find((result) => !result.ok);
    if (deleteFailure && !deleteFailure.ok) {
      setMessage(`Could not clear confirmed records: ${deleteFailure.error}`);
      await refresh();
      return;
    }
    setActionResponse(null);
    setClearConfirmation('');
    await refresh();
    setMessage('Confirmed records cleared.');
  }

  async function retryRecord(localId: string) {
    const result = await updateOfflineEarnRecord(localId, (record) => ({
      ...record,
      syncState: 'waiting-to-sync',
      lastError: null,
    }));
    if (!result.ok) {
      setMessage(`Could not requeue ${localId}: ${result.error}`);
      await refresh();
      return;
    }
    setMessage(`Requeued ${localId} for the next sync batch.`);
    await refresh();
  }

  return (
    <section className="cashier-sync-page">
      <header className="cashier-sync-header">
        <h1>Sync Queue</h1>
        <p className="cashier-sync-muted">
          Review transactions saved while offline, then send them when the
          connection is ready.
        </p>
        <p className="cashier-sync-muted">
          Confirmed transactions remain available until you clear them.
        </p>
      </header>

      <Alert tone="info" title="Offline transaction queue">
        Transactions saved without a connection stay on this device until they
        are sent and confirmed by ShopCity.
      </Alert>

      <section className="sc-card sc-card--standard cashier-sync-card">
        <h2>Sync actions</h2>
        <div className="cashier-sync-actions">
          <Input
            aria-label="Device ID"
            placeholder="Authenticated device"
            value={deviceId}
            readOnly
          />
          <Button onClick={() => void refresh()} variant="secondary">
            Refresh
          </Button>
          <Button
            aria-label="Submit batch"
            onClick={() => void syncBatch()}
            loading={busy}
          >
            Sync waiting transactions
          </Button>
        </div>
        <p className="cashier-sync-muted">{message}</p>
        <p className="cashier-sync-muted">
          Device ID: {deviceId || 'Unavailable until device-bound login'}
        </p>
        <p className="cashier-sync-muted">
          Waiting and retryable transactions are sent together for confirmation.
        </p>
      </section>

      <div className="cashier-sync-statuses" aria-label="Sync queue summary">
        <StatusBadge label={`Waiting ${statusBuckets.waiting}`} tone="info" />
        <StatusBadge
          label={`Syncing ${statusBuckets.syncing}`}
          tone="neutral"
        />
        <StatusBadge
          label={`Needs attention ${statusBuckets.needsAttention}`}
          tone="warning"
        />
        <StatusBadge label={`Synced ${statusBuckets.synced}`} tone="success" />
      </div>
      <div
        className="cashier-sync-statuses cashier-sync-statuses--raw"
        aria-label="Raw sync states"
      >
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

      <p className="cashier-sync-muted">
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

      <div className="cashier-sync-priority">
        <section className="sc-card sc-card--standard cashier-sync-card cashier-sync-card--highlight">
          <h2>Selected details</h2>
          {selectedRecord ? (
            <>
              <p className="cashier-sync-muted">
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

        <section className="sc-card sc-card--standard cashier-sync-card cashier-sync-card--highlight">
          <h2>Backend response</h2>
          <p className="cashier-sync-muted">
            {actionResponse
              ? 'The latest sync result and transaction outcomes are visible here.'
              : 'Sync a batch to inspect its technical result and transaction outcomes.'}
          </p>
          {actionResponse ? (
            <details>
              <summary>Technical details</summary>
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
            </details>
          ) : (
            <Alert tone="warning" title="No sync result">
              Sync a batch to surface technical reconciliation details.
            </Alert>
          )}
          <div className="cashier-sync-statuses">
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
          <div className="cashier-sync-toolbar">
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

      <section className="sc-card sc-card--standard cashier-sync-card cashier-sync-queue">
        <div className="cashier-sync-queue-header">
          <div>
            <h2>Queue records</h2>
            <p className="cashier-sync-muted">
              Showing {filteredRecords.length} of {records.length} local
              records.
            </p>
          </div>
          <div className="cashier-sync-filters">
            <Input
              aria-label="Search sync queue"
              placeholder="Receipt, card serial or local ID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Select
              aria-label="Filter sync queue by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              options={[
                { value: '', label: 'All states' },
                { value: 'waiting-to-sync', label: 'Waiting' },
                { value: 'syncing', label: 'Syncing' },
                { value: 'awaiting-approval', label: 'Awaiting approval' },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'rejected', label: 'Rejected' },
                { value: 'retry-required', label: 'Retry required' },
                { value: 'saved-on-device', label: 'Saved on device' },
              ]}
            />
          </div>
        </div>
        {records.length === 0 ? (
          <Alert tone="warning" title="No offline records">
            There are no local offline earn records to sync.
          </Alert>
        ) : filteredRecords.length === 0 ? (
          <Alert tone="warning" title="No matching queue records">
            Adjust the search or status filter. Summary counts above still cover
            the full local queue.
          </Alert>
        ) : (
          <div className="cashier-sync-table-scroll">
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
                {filteredRecords.map((record) => (
                  <tr key={record.localId}>
                    <td>
                      <button
                        type="button"
                        onClick={() => setSelectedLocalId(record.localId)}
                        className="cashier-sync-row-button"
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
                        <div className="cashier-sync-small-text">
                          {record.lastError}
                        </div>
                      ) : null}
                      {record.serverTransactionId || record.serverApprovalId ? (
                        <div className="cashier-sync-small-text">
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
          </div>
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
