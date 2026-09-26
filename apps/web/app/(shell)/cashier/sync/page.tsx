'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSessionBootstrapState } from '../../../../components/session-bootstrap';
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
import {
  Alert,
  Button,
  Input,
  Select,
  Table,
  useDialogLifecycle,
} from '../../../../components/ui';
import { Money, StatusBadge } from '../../../../components/shopcity';

export default function CashierSyncPage() {
  const [records, setRecords] = useState<OfflineEarnRecord[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [message, setMessage] = useState('Loading offline queue…');
  const [queueAccessAvailable, setQueueAccessAvailable] = useState<
    boolean | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [lastBatchResults, setLastBatchResults] = useState<
    OfflineSyncControllerEarnBatchV1200DataRecordsItem[]
  >([]);
  const [selectedLocalId, setSelectedLocalId] = useState<string | null>(null);
  const [detailLocalId, setDetailLocalId] = useState<string | null>(null);
  const [clearConfirmation, setClearConfirmation] = useState('');
  const detailTriggerRef = useRef<HTMLButtonElement | null>(null);
  const detailModalRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionResponse, setActionResponse] = useState<Record<
    string,
    unknown
  > | null>(null);
  const { deviceId: sessionDeviceId } = useSessionBootstrapState();
  const deviceUnavailable = queueAccessAvailable !== true || !deviceId;

  const selectedRecord = useMemo(
    () => records.find((record) => record.localId === selectedLocalId) ?? null,
    [records, selectedLocalId],
  );
  const detailRecord = useMemo(
    () => records.find((record) => record.localId === detailLocalId) ?? null,
    [detailLocalId, records],
  );
  useDialogLifecycle(Boolean(detailRecord), closeDetail, detailModalRef);

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
          .some((value) => value.toLowerCase().includes(normalizedSearch));
      const matchesStatus = !statusFilter || record.syncState === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [records, search, statusFilter]);

  const selectedPreview = selectedRecord
    ? [
        ['Local ID', selectedRecord.localId],
        ['Card', selectedRecord.cardBarcode ?? 'Not available'],
        ['Receipt', selectedRecord.receiptNumber ?? 'Not available'],
        ['State', labelForSyncState(selectedRecord.syncState)],
        [
          'Server transaction',
          selectedRecord.serverTransactionId ?? 'Not available',
        ],
        ['Server approval', selectedRecord.serverApprovalId ?? 'Not available'],
        ['Last error', selectedRecord.lastError ?? 'None recorded'],
      ]
    : [];

  async function refresh() {
    try {
      const next = await listOfflineEarnRecords();
      setRecords(next);
      setQueueAccessAvailable(true);
      setSelectedLocalId((current) => current ?? next[0]?.localId ?? null);
      setMessage('');
      setActionResponse(null);
    } catch {
      setRecords([]);
      setQueueAccessAvailable(false);
      setSelectedLocalId(null);
      setMessage('Unable to load saved purchases.');
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
    if (queueAccessAvailable !== true) {
      setMessage('Saved purchases are unavailable in this session.');
      return;
    }

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

  function closeDetail() {
    setDetailLocalId(null);
    requestAnimationFrame(() => detailTriggerRef.current?.focus());
  }

  function openDetail(record: OfflineEarnRecord, trigger: HTMLButtonElement) {
    setSelectedLocalId(record.localId);
    setDetailLocalId(record.localId);
    detailTriggerRef.current = trigger;
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
    <section
      className="cashier-sync-page"
      data-od-id="sync-queue-view"
      aria-labelledby="cashier-sync-title"
    >
      <header className="cashier-sync-header" data-od-id="sync-queue-heading">
        <div>
          <h1 id="cashier-sync-title">Sync Queue</h1>
          <p className="cashier-sync-muted">
            Purchases saved offline on this device.
          </p>
        </div>
        <div
          className="cashier-sync-header-actions"
          data-od-id="sync-queue-toolbar"
          role="toolbar"
          aria-label="Sync queue controls"
        >
          <span className="cashier-sync-device" aria-label="Device identity">
            Device: {deviceId || 'Unavailable in this session'}
          </span>
          <Button onClick={() => void refresh()} variant="secondary">
            Refresh
          </Button>
          <Button
            aria-label="Sync eligible records"
            className="cashier-sync-header-submit"
            onClick={() => void syncBatch()}
            disabled={
              queueAccessAvailable !== true ||
              !deviceId.trim() ||
              queueableRecords.length === 0
            }
            loading={busy}
          >
            Sync eligible records
          </Button>
        </div>
        {message && message !== 'Loading offline queue…' ? (
          <p className="cashier-sync-muted" role="status">
            {message}
          </p>
        ) : null}
      </header>

      <section
        className={`cashier-sync-device-status${deviceUnavailable ? ' cashier-sync-device-status--unavailable' : ''}`}
        aria-live="polite"
      >
        <div>
          <p className="cashier-sync-eyebrow">Device access</p>
          <h2>
            {queueAccessAvailable === null
              ? 'Checking device access…'
              : deviceUnavailable
                ? 'Device unavailable in this session'
                : 'Device queue ready'}
          </h2>
          <p>
            {queueAccessAvailable === false
              ? 'This session cannot access purchases saved on this device. Your internet connection may be active, but device queue access is not ready.'
              : deviceUnavailable
                ? 'The browser may be online, but this session has no ready device identity for syncing. Reconnect the cashier session before syncing.'
                : 'Saved purchases can be reviewed here before they are submitted for sync.'}
          </p>
        </div>
        {queueAccessAvailable === false ? (
          <Button onClick={() => void refresh()} variant="secondary">
            Retry access
          </Button>
        ) : null}
      </section>

      <section
        className="cashier-sync-metrics"
        data-od-id="sync-queue-metrics"
        aria-label="Sync queue summary"
      >
        {queueAccessAvailable === false ? null : records.length === 0 ? (
          <p className="cashier-sync-summary-line">
            0 waiting · 0 need attention
          </p>
        ) : (
          <div className="cashier-sync-statuses">
            <StatusBadge
              label={`Waiting ${statusBuckets.waiting}`}
              tone="info"
            />
            <StatusBadge
              label={`Syncing ${statusBuckets.syncing}`}
              tone="neutral"
            />
            <StatusBadge
              label={`Needs attention ${statusBuckets.needsAttention}`}
              tone="warning"
            />
            <StatusBadge
              label={`Synced ${statusBuckets.synced}`}
              tone="success"
            />
          </div>
        )}
        {records.length > 0 ? (
          <details className="cashier-sync-secondary-details">
            <summary>Detailed queue states</summary>
            <div
              className="cashier-sync-statuses cashier-sync-statuses--raw"
              role="group"
              aria-label="Detailed queue state counts"
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
          </details>
        ) : null}
      </section>

      <div className="cashier-sync-priority">
        <section
          className="sc-card sc-card--standard cashier-sync-card cashier-sync-queue"
          data-od-id="sync-queue-table"
        >
          <div className="cashier-sync-queue-header">
            <div>
              <h2>Queue records</h2>
            </div>
            {records.length > 0 && queueAccessAvailable !== false ? (
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
            ) : null}
          </div>
          {queueAccessAvailable === false ? (
            <Alert tone="warning" title="Unable to load saved purchases">
              Restore device access to view the queue. This session cannot
              confirm whether saved purchases are waiting.
            </Alert>
          ) : records.length === 0 ? (
            <div className="cashier-sync-empty-state">
              <h3>No purchases waiting to sync</h3>
              <p>
                Purchases saved offline on this device will appear here until
                they are confirmed.
              </p>
              <Link
                className="sc-button sc-button--secondary"
                href="/cashier/earn"
              >
                Back to Capture Purchase
              </Link>
            </div>
          ) : filteredRecords.length === 0 ? (
            <Alert tone="warning" title="No matching queue records">
              Adjust the search or status filter. Summary counts above still
              cover the full local queue.
            </Alert>
          ) : (
            <div className="cashier-sync-table-scroll">
              <Table aria-label="Offline sync queue records">
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
                          onClick={(event) =>
                            openDetail(record, event.currentTarget)
                          }
                          className="cashier-sync-row-button"
                          aria-label={`Open sync details for ${record.localId}`}
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
                          label={labelForSyncState(record.syncState)}
                          tone={toneForState(record.syncState)}
                        />
                        {record.lastError ? (
                          <div className="cashier-sync-small-text">
                            {record.lastError}
                          </div>
                        ) : null}
                        {record.serverTransactionId ||
                        record.serverApprovalId ? (
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
                          'No action'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
          {queueAccessAvailable !== false ? (
            <footer className="cashier-sync-footer">
              <p className="cashier-sync-muted">
                Showing {filteredRecords.length} of {records.length} local
                records.
              </p>
              <span className="cashier-sync-muted">
                Records remain on this device until confirmed.
              </span>
            </footer>
          ) : null}
        </section>

        {selectedRecord ? (
          <details className="cashier-sync-secondary-details">
            <summary>
              Selected record details · {selectedRecord.localId} ·{' '}
              {labelForSyncState(selectedRecord.syncState)}
            </summary>
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
          </details>
        ) : null}

        {lastBatchResults.length > 0 || actionResponse ? (
          <section className="sc-card sc-card--standard cashier-sync-card cashier-sync-results">
            <h2>Sync activity</h2>
            <p className="cashier-sync-muted">
              Results are shown per record. A record may be confirmed, await
              approval, be rejected, or need another attempt.
            </p>
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
              <details className="cashier-sync-secondary-details">
                <summary>
                  Per-record results ({lastBatchResults.length})
                </summary>
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
                            label={labelForSyncResult(result.status)}
                            tone={toneForResult(result.status)}
                          />
                        </td>
                        <td>{result.transactionId ?? 'Not available'}</td>
                        <td>{result.approvalId ?? 'Not available'}</td>
                        <td>
                          {typeof result.creditEarnedKobo === 'number' ? (
                            <Money amountKobo={result.creditEarnedKobo} />
                          ) : (
                            'Not available'
                          )}
                        </td>
                        <td>{result.retryable ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </details>
            ) : null}
            {actionResponse ? (
              <details className="cashier-sync-secondary-details">
                <summary>Technical response details</summary>
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
            ) : null}
            {records.some((record) => record.syncState === 'confirmed') ? (
              <div className="cashier-sync-clear-actions">
                <Input
                  aria-label="Clear confirmation"
                  placeholder="Type CLEAR to remove confirmed"
                  value={clearConfirmation}
                  onChange={(event) => setClearConfirmation(event.target.value)}
                />
                <Button variant="ghost" onClick={() => void clearConfirmed()}>
                  Clear confirmed
                </Button>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
      {detailRecord ? (
        <div
          className="transaction-detail-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDetail();
          }}
        >
          <div
            ref={detailModalRef}
            className="transaction-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sync-detail-title"
          >
            <div className="transaction-detail-modal__head">
              <div>
                <p className="section-label">Offline transaction detail</p>
                <h2 id="sync-detail-title">{detailRecord.localId}</h2>
                <p className="transaction-detail-modal__note">
                  Device-local metadata and sync outcome only.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                aria-label="Close sync detail"
                onClick={closeDetail}
              >
                <X aria-hidden="true" size={16} />
                Close
              </Button>
            </div>
            <div className="transaction-detail-columns">
              <dl className="transaction-detail-list">
                <div>
                  <dt>Card</dt>
                  <dd>{detailRecord.cardBarcode || 'Not provided'}</dd>
                </div>
                <div>
                  <dt>Receipt</dt>
                  <dd>{detailRecord.receiptNumber || 'Not provided'}</dd>
                </div>
                <div>
                  <dt>Purchase amount</dt>
                  <dd>
                    <Money amountKobo={detailRecord.purchaseAmountKobo} />
                  </dd>
                </div>
                <div>
                  <dt>State</dt>
                  <dd>{labelForSyncState(detailRecord.syncState)}</dd>
                </div>
              </dl>
              <div className="transaction-detail-context">
                <div className="transaction-receipt-preview">
                  Offline receipt image not stored in the queue record
                </div>
                <section
                  className="transaction-audit"
                  aria-labelledby="sync-audit-title"
                >
                  <h3 id="sync-audit-title">Sync trail</h3>
                  <div className="transaction-audit-list">
                    <div>
                      <strong>Server transaction</strong>
                      <span>
                        {detailRecord.serverTransactionId ?? 'Not provided'}
                      </span>
                    </div>
                    <div>
                      <strong>Server approval</strong>
                      <span>
                        {detailRecord.serverApprovalId ?? 'Not provided'}
                      </span>
                    </div>
                    <div>
                      <strong>Last error</strong>
                      <span>{detailRecord.lastError ?? 'None recorded'}</span>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function renderValue(value: unknown) {
  if (value === null || value === undefined) return 'Not available';
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
    return String(value);
  return JSON.stringify(value, null, 2);
}

function labelForSyncState(state: OfflineEarnRecord['syncState']) {
  switch (state) {
    case 'waiting-to-sync':
      return 'Waiting to sync';
    case 'saved-on-device':
      return 'Saved on this device';
    case 'syncing':
      return 'Syncing';
    case 'retry-required':
      return 'Needs another attempt';
    case 'awaiting-approval':
      return 'Awaiting approval';
    case 'confirmed':
      return 'Confirmed';
    case 'rejected':
      return 'Rejected';
  }
}

function labelForSyncResult(
  status: OfflineSyncControllerEarnBatchV1200DataRecordsItem['status'],
) {
  if (status === 'CONFIRMED') return 'Confirmed';
  if (status === 'PENDING_APPROVAL') return 'Awaiting approval';
  if (status === 'REJECTED') return 'Rejected';
  return 'Needs another attempt';
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
