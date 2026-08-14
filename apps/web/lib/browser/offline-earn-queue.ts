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
  deviceId?: string;
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

    Promise.resolve(action(store))
      .then((value) => {
        tx.oncomplete = () => {
          db.close();
          resolve(value as T);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error('IndexedDB transaction failed'));
        };
      })
      .catch((error) => {
        db.close();
        reject(error);
      });
  });
}

export async function saveOfflineEarnRecord(record: OfflineEarnRecord) {
  await withStore('readwrite', (store) => {
    store.put(record);
  });
  notifyQueueChanged();
}

export async function listOfflineEarnRecords() {
  return withStore<OfflineEarnRecord[]>('readonly', (store) => {
    return new Promise<OfflineEarnRecord[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as OfflineEarnRecord[]);
      request.onerror = () =>
        reject(request.error ?? new Error('Failed to read offline queue'));
    });
  });
}

export async function getOfflineEarnRecordCount() {
  return withStore<number>('readonly', (store) => {
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
  notifyQueueChanged();
}

export async function deleteOfflineEarnRecord(localId: string) {
  await withStore('readwrite', (store) => {
    store.delete(localId);
  });
  notifyQueueChanged();
}
