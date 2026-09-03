import type { SmokeConfig } from '../config';
import type { SmokeApiSession } from './api-client';
import type { SmokeBaseline } from './fixtures';
import type { InvariantReader } from './reconciliation';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function integer(value: unknown, key: string): number {
  const result = record(value)[key];
  if (typeof result !== 'number' || !Number.isInteger(result)) {
    throw new Error(`Smoke invariant response missing integer ${key}`);
  }
  return result;
}

export async function assertApiRecordExists(
  api: SmokeApiSession,
  path: string,
  description = path,
): Promise<Record<string, unknown>> {
  const value = await api.get<unknown>(path);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Smoke post-condition missing: ${description}`);
  }
  return value as Record<string, unknown>;
}

export async function assertIntegerBalance(
  api: SmokeApiSession,
  customerId: string,
  expectedKobo: number,
): Promise<void> {
  const customer = await assertApiRecordExists(
    api,
    `/api/v1/customers/${customerId}`,
    `customer ${customerId}`,
  );
  const balance = customer.balanceKobo ?? customer.balance;
  if (balance !== expectedKobo) {
    throw new Error(`Smoke balance mismatch for ${customerId}`);
  }
}

export function createApiInvariantReader(
  api: SmokeApiSession,
  config: SmokeConfig,
): InvariantReader {
  const customerPath = `/api/v1/customers/${config.activeCustomerId}`;
  const cardPath = `/api/v1/cards/lookup/${config.activeCardSerial}`;

  async function pilotSummary(): Promise<Record<string, unknown>> {
    const response = record(
      await api.get('/api/v1/reports/pilot-operations-summary'),
    );
    return record(response.data ?? response);
  }

  return {
    async balanceKobo() {
      const customer = record(await api.get<unknown>(customerPath));
      const balance =
        customer.balanceKobo ??
        customer.availableBalanceKobo ??
        customer.balance;
      return integer({ balanceKobo: balance }, 'balanceKobo');
    },
    async unresolvedApprovals() {
      const response = record(await api.get('/api/v1/approvals?limit=100'));
      const items = Array.isArray(response.items) ? response.items : [];
      return items.filter((item) => {
        const status = record(item).status;
        return status === 'PENDING' || status === 'PENDING_APPROVAL';
      }).length;
    },
    async openFraudFlags() {
      const summary = await pilotSummary();
      return integer(record(summary.fraud), 'openCount');
    },
    async openFraudFlagIds() {
      const response = record(
        await api.get('/api/v1/fraud-flags?status=OPEN&limit=100'),
      );
      const items = Array.isArray(response.items) ? response.items : [];
      return items.flatMap((item) => {
        const id = record(item).id;
        return typeof id === 'string' ? [id] : [];
      });
    },
    async deviceState() {
      const devices = await api.get<unknown>('/api/v1/devices');
      const items = Array.isArray(devices) ? devices : record(devices).items;
      const device = Array.isArray(items)
        ? items.find((item) => record(item).id === config.deviceId)
        : undefined;
      if (!device)
        throw new Error('Smoke device missing from invariant response');
      const value = record(device);
      return {
        id: String(value.id),
        status: String(value.status),
        branchId: String(value.branchId),
      };
    },
    async cardState() {
      const value = await api.get<unknown>(cardPath);
      const card = record(value);
      return {
        serialNumber: String(card.serialNumber),
        status: String(card.status),
        customerId: String(card.customerId),
      };
    },
    async customerState() {
      const value = record(await api.get(customerPath));
      return { id: String(value.id), status: String(value.status) };
    },
    async offlineRetryRequired() {
      const summary = await pilotSummary();
      return integer(record(summary.offlineSync), 'failureCount');
    },
    async creditLotHealthy() {
      const summary = await pilotSummary();
      return record(summary.reconciliation).healthy === true;
    },
    async outboxBacklog() {
      const summary = await pilotSummary();
      return integer(record(summary.outbox), 'backlogCount');
    },
  };
}

export type { SmokeBaseline };
