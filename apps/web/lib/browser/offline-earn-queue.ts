'use client';

export type OfflineEarnRecordState =
  | 'saved-on-device'
  | 'waiting-to-sync'
  | 'syncing'
  | 'confirmed'
  | 'awaiting-approval'
  | 'rejected'
  | 'retry-required';

export type OfflineEarnRecord = {
  localId: string;
  idempotencyKey: string;
  cashierId: string;
  branchId: string;
  deviceId: string;
  customerId?: string;
  cardBarcode: string;
  receiptNumber: string;
  receiptWeekStart: string;
  purchaseAmountKobo: number;
  occurredAtLocal: string;
  syncState: OfflineEarnRecordState;
  lastError?: string | null;
  serverTransactionId?: string | null;
  serverApprovalId?: string | null;
};

export type OfflineWriteResult = { ok: true } | { ok: false; error: string };

const DB_NAME = 'shopcity-offline';
const STORE_NAME = 'earn-records';
const DB_VERSION = 1;

type QueueListener = () => void;

const listeners = new Set<QueueListener>();

export function subscribeOfflineQueue(listener: QueueListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyQueueChanged() {
  listeners.forEach((listener) => listener());
}

function openDatabase() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is unavailable'));
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'localId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => void | Promise<T>,
) {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    let value!: T;

    // Register transaction handlers before issuing any request. In particular,
    // a fast `put` can complete before a later microtask installs handlers.
    tx.oncomplete = () => {
      db.close();
      resolve(value);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('IndexedDB transaction failed'));
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    };

    void (async () => {
      try {
        value = (await action(store)) as unknown as T;
      } catch (error) {
        try {
          tx.abort();
        } catch {
          db.close();
          reject(error);
        }
      }
    })();
  });
}

async function runWrite(
  action: () => Promise<void>,
): Promise<OfflineWriteResult> {
  try {
    await action();
    notifyQueueChanged();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Offline storage failed',
    };
  }
}

export async function saveOfflineEarnRecord(record: OfflineEarnRecord) {
  if (!record.deviceId.trim() || !record.branchId.trim()) {
    return {
      ok: false as const,
      error: 'Device and branch context are required for offline records',
    };
  }

  return runWrite(async () => {
    await withStore('readwrite', (store) => {
      store.put(record);
    });
  });
}

export async function listOfflineEarnRecords() {
  return await withStore<OfflineEarnRecord[]>('readonly', (store) => {
    return new Promise<OfflineEarnRecord[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as OfflineEarnRecord[]);
      request.onerror = () =>
        reject(request.error ?? new Error('Failed to read offline queue'));
    });
  });
}

export async function getOfflineEarnRecordCount() {
  return await withStore<number>('readonly', (store) => {
    return new Promise<number>((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error('Failed to count offline queue'));
    });
  });
}

export async function updateOfflineEarnRecord(
  localId: string,
  updater: (record: OfflineEarnRecord) => OfflineEarnRecord,
) {
  return runWrite(async () => {
    await withStore('readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.get(localId);
        request.onsuccess = () => {
          const current = request.result as OfflineEarnRecord | undefined;
          if (!current) {
            resolve();
            return;
          }

          const next = updater(current);
          const putRequest = store.put(next);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () =>
            reject(
              putRequest.error ?? new Error('Failed to update offline record'),
            );
        };
        request.onerror = () =>
          reject(request.error ?? new Error('Failed to load offline record'));
      });
    });
  });
}

export async function deleteOfflineEarnRecord(localId: string) {
  return runWrite(async () => {
    await withStore('readwrite', (store) => {
      store.delete(localId);
    });
  });
}
