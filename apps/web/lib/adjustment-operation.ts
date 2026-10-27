export interface AdjustmentOperationIdentity {
  idempotencyKey: string;
  effectiveAt: string;
  createdAt: string;
}

export interface AdjustmentOperationPayload {
  customerId: string;
  amountKobo: number;
  reason: string;
  kind: 'CREDIT' | 'DEBIT';
}

interface StoredAdjustmentOperation extends AdjustmentOperationIdentity {
  payloadDigest: string;
}

export interface AdjustmentOperationStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface AdjustmentOperationOptions {
  storage?: AdjustmentOperationStorage;
  digest?: (canonicalPayload: string) => Promise<string>;
  createId?: () => string;
  now?: () => string;
}

const STORAGE_KEY = 'shopcity.adjustment-operation-identities';
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const ADJUSTMENT_IDENTITY_FAILURE_MESSAGE =
  'Adjustment outcome is uncertain. Stored retry identity is unavailable or expired; do not submit a new adjustment until the outcome has been verified.';

function getStorage(
  storage?: AdjustmentOperationStorage,
): AdjustmentOperationStorage {
  try {
    const resolved = storage ?? window.sessionStorage;
    if (!resolved) throw new Error(ADJUSTMENT_IDENTITY_FAILURE_MESSAGE);
    return resolved;
  } catch {
    throw new Error(ADJUSTMENT_IDENTITY_FAILURE_MESSAGE);
  }
}

async function sha256(canonicalPayload: string): Promise<string> {
  if (!globalThis.crypto?.subtle)
    throw new Error(ADJUSTMENT_IDENTITY_FAILURE_MESSAGE);
  const bytes = new TextEncoder().encode(canonicalPayload);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

function isCanonicalIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

function isStoredAdjustmentOperation(
  item: unknown,
): item is StoredAdjustmentOperation {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as Record<string, unknown>;
  return (
    Object.keys(candidate).sort().join(',') ===
      'createdAt,effectiveAt,idempotencyKey,payloadDigest' &&
    typeof candidate.payloadDigest === 'string' &&
    /^[0-9a-f]{64}$/i.test(candidate.payloadDigest) &&
    typeof candidate.idempotencyKey === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      candidate.idempotencyKey,
    ) &&
    isCanonicalIsoTimestamp(candidate.effectiveAt) &&
    isCanonicalIsoTimestamp(candidate.createdAt) &&
    candidate.effectiveAt === candidate.createdAt
  );
}

function parseStoredOperations(
  value: string | null,
): StoredAdjustmentOperation[] {
  if (value === null) return [];
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || !parsed.every(isStoredAdjustmentOperation)) {
    throw new Error(ADJUSTMENT_IDENTITY_FAILURE_MESSAGE);
  }
  const digests = new Set(parsed.map((operation) => operation.payloadDigest));
  const keys = new Set(parsed.map((operation) => operation.idempotencyKey));
  if (digests.size !== parsed.length || keys.size !== parsed.length) {
    throw new Error(ADJUSTMENT_IDENTITY_FAILURE_MESSAGE);
  }
  return parsed;
}

function findStoredOperation(
  storage: AdjustmentOperationStorage,
  payloadDigest: string,
  currentTime: string,
): StoredAdjustmentOperation | undefined {
  let operations: StoredAdjustmentOperation[];
  try {
    operations = parseStoredOperations(storage.getItem(STORAGE_KEY));
  } catch {
    throw new Error(ADJUSTMENT_IDENTITY_FAILURE_MESSAGE);
  }
  const existing = operations.find(
    (item) => item.payloadDigest === payloadDigest,
  );
  if (
    existing &&
    Date.parse(currentTime) - Date.parse(existing.createdAt) >= RETENTION_MS
  ) {
    throw new Error(ADJUSTMENT_IDENTITY_FAILURE_MESSAGE);
  }
  return existing;
}

export async function getAdjustmentOperationIdentity(
  payload: AdjustmentOperationPayload,
  options: AdjustmentOperationOptions = {},
): Promise<AdjustmentOperationIdentity> {
  const storage = getStorage(options.storage);
  const digest = options.digest ?? sha256;
  const canonicalPayload = JSON.stringify({
    customerId: payload.customerId,
    amountKobo: payload.amountKobo,
    reason: payload.reason,
    kind: payload.kind,
  });
  let payloadDigest: string;
  try {
    payloadDigest = await digest(canonicalPayload);
  } catch {
    throw new Error(ADJUSTMENT_IDENTITY_FAILURE_MESSAGE);
  }
  if (!payloadDigest) throw new Error(ADJUSTMENT_IDENTITY_FAILURE_MESSAGE);

  const createdAt = (options.now ?? (() => new Date().toISOString()))();
  const existing = findStoredOperation(storage, payloadDigest, createdAt);
  if (existing) return existing;
  const identity: StoredAdjustmentOperation = {
    payloadDigest,
    idempotencyKey: (options.createId ?? (() => crypto.randomUUID()))(),
    effectiveAt: createdAt,
    createdAt,
  };
  try {
    const operations = parseStoredOperations(storage.getItem(STORAGE_KEY));
    storage.setItem(STORAGE_KEY, JSON.stringify([...operations, identity]));
  } catch {
    throw new Error(ADJUSTMENT_IDENTITY_FAILURE_MESSAGE);
  }
  return identity;
}

export async function clearAdjustmentOperationIdentity(
  payload: AdjustmentOperationPayload,
  identity: AdjustmentOperationIdentity,
  options: Pick<AdjustmentOperationOptions, 'storage' | 'digest'> = {},
): Promise<void> {
  const storage = getStorage(options.storage);
  let payloadDigest: string;
  try {
    payloadDigest = await (options.digest ?? sha256)(
      JSON.stringify({
        customerId: payload.customerId,
        amountKobo: payload.amountKobo,
        reason: payload.reason,
        kind: payload.kind,
      }),
    );
    const operations = parseStoredOperations(storage.getItem(STORAGE_KEY));
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        operations.filter(
          (item) =>
            item.payloadDigest !== payloadDigest ||
            item.idempotencyKey !== identity.idempotencyKey,
        ),
      ),
    );
  } catch {
    throw new Error(ADJUSTMENT_IDENTITY_FAILURE_MESSAGE);
  }
}
