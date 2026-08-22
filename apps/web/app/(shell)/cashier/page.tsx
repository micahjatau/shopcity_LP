'use client';

import Link from 'next/link';
import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useSessionBootstrapState } from '../../../components/session-bootstrap';
import {
  ConnectionStatus,
  OfflineIndicator,
  SyncQueueIndicator,
} from '../../../components/offline';
import { ScannerContextScope } from '../../../components/scanner-context-scope';
import { Alert, Button, Input, Separator } from '../../../components/ui';
import { Money, StatusBadge } from '../../../components/shopcity';
import { WorkflowSection } from '../../../components/workflows';
import {
  cardsControllerLookupCardV1,
  customersControllerGetCustomerV1,
  loyaltyControllerGetCustomerLedgerV1,
} from '../../../lib/api/generated-client';
import {
  configurationControllerGetPublicConfigV1,
  createApiRequest,
} from '../../../lib/api';

const cashierLaunchCards = [
  {
    title: 'Lookup',
    href: '/cashier/lookup',
    body: 'Scan or type a serial number to load the customer and card context.',
  },
  {
    title: 'Earn',
    href: '/cashier/earn',
    body: 'Post an earn transaction once lookup context is loaded.',
  },
  {
    title: 'Redeem',
    href: '/cashier/redeem',
    body: 'Move into redemption with the customer and card context in place.',
  },
] as const;

type CashierLookupRecord = {
  customer?: { id?: string; fullName?: string };
  customerId?: string;
  customerName?: string;
  serialNumber?: string;
  cardSerialNumber?: string;
  status?: string;
  cardStatus?: string;
  availableBalanceKobo?: number;
  balanceKobo?: number;
  expiringCreditKobo?: number;
  branchId?: string;
};

type CashierCustomerRecord = {
  fullName?: string;
  name?: string;
  status?: string;
  balanceKobo?: number;
  availableBalanceKobo?: number;
};

type CashierLedgerItem = {
  id?: string;
  type?: string;
  transactionType?: string;
  amountKobo?: number;
};

type CashierLedgerRecord = {
  items?: CashierLedgerItem[];
};

type CashierPolicyConfig = {
  tenant?: { id?: string; name?: string };
  branch?: {
    id?: string;
    name?: string;
    timezone?: string;
    receiptWeekStartDay?: number;
  };
  policies?: {
    defaultEarnRateBps?: number;
    minRedemptionKobo?: number;
    maxRedemptionBasketPercent?: number;
    purchaseFlagThresholdKobo?: number;
    redemptionApprovalThresholdKobo?: number;
  };
};

export default function CashierPage() {
  const [lookupValue, setLookupValue] = useState('');
  const [lookupMessage, setLookupMessage] = useState(
    'Scan or type a card serial.',
  );
  const [lookupRecord, setLookupRecord] = useState<CashierLookupRecord | null>(
    null,
  );
  const [customerRecord, setCustomerRecord] =
    useState<CashierCustomerRecord | null>(null);
  const [ledgerRecord, setLedgerRecord] = useState<CashierLedgerRecord | null>(
    null,
  );
  const [policyConfig, setPolicyConfig] = useState<CashierPolicyConfig | null>(
    null,
  );
  const [policyMessage, setPolicyMessage] = useState('Loading branch policy…');
  const { userId } = useSessionBootstrapState();

  const customerId = useMemo(
    () => lookupRecord?.customer?.id ?? lookupRecord?.customerId ?? null,
    [lookupRecord],
  );

  useEffect(() => {
    let ignore = false;

    async function loadPolicy() {
      try {
        const response =
          await configurationControllerGetPublicConfigV1(createApiRequest());
        if (!ignore && response.status === 200) {
          setPolicyConfig(response.data.data);
          setPolicyMessage(
            'Branch policy loaded from the public config endpoint.',
          );
          return;
        }
        if (!ignore) {
          setPolicyConfig(null);
          setPolicyMessage(`Branch policy unavailable (${response.status}).`);
        }
      } catch {
        if (!ignore) {
          setPolicyConfig(null);
          setPolicyMessage('Branch policy unavailable.');
        }
      }
    }

    async function loadCustomer() {
      if (!customerId) {
        setCustomerRecord(null);
        setLedgerRecord(null);
        return;
      }

      try {
        const response = await customersControllerGetCustomerV1(
          customerId,
          createApiRequest({ csrf: true }),
        );
        if (!ignore && response.status === 200) {
          setCustomerRecord(response.data.data);
        }
      } catch {
        if (!ignore) setCustomerRecord(null);
      }

      try {
        const response = await loyaltyControllerGetCustomerLedgerV1(
          customerId,
          { limit: '5', cursor: '' },
          createApiRequest({ csrf: true }),
        );
        if (!ignore && response.status === 200) {
          setLedgerRecord(response.data.data);
        }
      } catch {
        if (!ignore) setLedgerRecord(null);
      }
    }

    void loadPolicy();
    void loadCustomer();

    return () => {
      ignore = true;
    };
  }, [customerId]);

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = lookupValue.trim();
    if (!query) {
      setLookupMessage('Enter a card serial number first.');
      setLookupRecord(null);
      return;
    }

    setLookupMessage('Looking up customer and card context…');
    try {
      const response = await cardsControllerLookupCardV1(
        query,
        createApiRequest({ csrf: true }),
      );

      if (response.status === 200) {
        const record = response.data.data;
        setLookupRecord(record);
        setLookupMessage(
          'Lookup resolved. Earn and redeem can now use this context.',
        );
        return;
      }

      setLookupRecord(null);
      setLookupMessage(`Lookup unavailable (${response.status}).`);
    } catch {
      setLookupRecord(null);
      setLookupMessage('Lookup could not be completed.');
    }
  }

  const lookupSummary: Array<[string, ReactNode]> = lookupRecord
    ? [
        [
          'Customer',
          lookupRecord.customer?.fullName ?? lookupRecord.customerName ?? '—',
        ],
        ['Card status', lookupRecord.status ?? lookupRecord.cardStatus ?? '—'],
        [
          'Available balance',
          typeof lookupRecord.availableBalanceKobo === 'number' ? (
            <Money amountKobo={lookupRecord.availableBalanceKobo} />
          ) : (
            '—'
          ),
        ],
        [
          'Expiring credit',
          typeof lookupRecord.expiringCreditKobo === 'number' ? (
            <Money amountKobo={lookupRecord.expiringCreditKobo} />
          ) : (
            '—'
          ),
        ],
      ]
    : [];

  const policyContext = policyConfig?.policies ?? null;
  const branchContext = policyConfig?.branch ?? null;
  const tenantContext = policyConfig?.tenant ?? null;
  const selectedCardSerial =
    lookupRecord?.serialNumber ??
    lookupRecord?.cardSerialNumber ??
    lookupValue.trim();

  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-5)' }}>
      <ScannerContextScope context="lookup" />
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Cashier overview</h1>
        <p
          style={{ color: 'var(--sc-color-semantic-textSecondary)', margin: 0 }}
        >
          Fast lookup, dedicated workflow launch, customer detail and sync entry
          points.
        </p>
        <div style={routeRow}>
          <ConnectionStatus />
          <SyncQueueIndicator />
        </div>
        <div style={policyRow}>
          <StatusBadge
            label={tenantContext?.name ?? tenantContext?.id ?? 'Tenant pending'}
            tone="info"
          />
          <StatusBadge
            label={branchContext?.name ?? branchContext?.id ?? 'Branch pending'}
            tone="neutral"
          />
          <StatusBadge
            label={branchContext?.timezone ?? 'Timezone pending'}
            tone="success"
          />
          <StatusBadge
            label={userId ? `User ${userId}` : 'User pending'}
            tone="info"
          />
          {typeof policyContext?.defaultEarnRateBps === 'number' ? (
            <StatusBadge
              label={`Earn ${policyContext.defaultEarnRateBps / 100}%`}
              tone="info"
            />
          ) : null}
        </div>
      </header>

      <OfflineIndicator />

      <WorkflowSection
        title="Cashier workflow"
        description="Scan first, then move into earn, redeem, customer detail, or sync follow-up."
      >
        <div style={gridStyle}>
          <article style={cardStyle} aria-label="Lookup and status">
            <h2 style={{ marginTop: 0 }}>Lookup and status</h2>
            <form
              onSubmit={(event) => void handleLookup(event)}
              style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}
            >
              <Input
                placeholder="Scan card serial number"
                aria-label="Lookup"
                value={lookupValue}
                onChange={(event) => setLookupValue(event.target.value)}
              />
              <Button type="submit">Lookup</Button>
            </form>
            <Alert tone="info" title="Session-aware shell">
              {lookupMessage}
            </Alert>
            {lookupRecord ? (
              <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
                {lookupSummary.map(([label, value]) => (
                  <div key={label} style={statRow}>
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>
                ))}
                <div style={tagRow}>
                  <StatusBadge
                    label={lookupRecord.status ?? 'LOOKUP'}
                    tone="success"
                  />
                  {lookupRecord.customer?.id || lookupRecord.customerId ? (
                    <Link
                      href={`/cashier/customers${lookupRecord.customer?.id || lookupRecord.customerId ? `?id=${lookupRecord.customer?.id ?? lookupRecord.customerId}` : ''}`}
                    >
                      View customer
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </article>

          <article style={cardStyle} aria-label="Policy context">
            <h2 style={{ marginTop: 0 }}>Policy context</h2>
            <p style={muted}>{policyMessage}</p>
            {policyContext ? (
              <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
                <div style={statRow}>
                  <span>Earn rate</span>
                  <strong>
                    {(policyContext.defaultEarnRateBps ?? 0) / 100}%
                  </strong>
                </div>
                <div style={statRow}>
                  <span>Min redemption</span>
                  {typeof policyContext.minRedemptionKobo === 'number' ? (
                    <Money amountKobo={policyContext.minRedemptionKobo} />
                  ) : (
                    '—'
                  )}
                </div>
                <div style={statRow}>
                  <span>Basket cap</span>
                  <strong>{policyContext.maxRedemptionBasketPercent}%</strong>
                </div>
                <div style={statRow}>
                  <span>Purchase flag</span>
                  {typeof policyContext.purchaseFlagThresholdKobo ===
                  'number' ? (
                    <Money
                      amountKobo={policyContext.purchaseFlagThresholdKobo}
                    />
                  ) : (
                    '—'
                  )}
                </div>
                <div style={statRow}>
                  <span>Approval threshold</span>
                  {typeof policyContext.redemptionApprovalThresholdKobo ===
                  'number' ? (
                    <Money
                      amountKobo={policyContext.redemptionApprovalThresholdKobo}
                    />
                  ) : (
                    '—'
                  )}
                </div>
              </div>
            ) : (
              <Alert tone="warning" title="Policy unavailable">
                The cashier workflow can still run, but policy-aware previews
                are unavailable.
              </Alert>
            )}
          </article>
        </div>
      </WorkflowSection>

      <div style={gridStyle}>
        <article style={cardStyle} aria-label="Action launchpad">
          <h2 style={{ marginTop: 0 }}>Action launchpad</h2>
          <p style={muted}>
            Quick entry points for the next cashier move, without repeating the
            full shell navigation.
          </p>
          <div style={launchGridStyle}>
            {cashierLaunchCards.map((card) => (
              <article key={card.title} style={launchCardStyle}>
                <strong>{card.title}</strong>
                <p style={muted}>{card.body}</p>
                <Link
                  href={
                    card.title === 'Earn' && selectedCardSerial
                      ? `${card.href}?card=${encodeURIComponent(selectedCardSerial)}`
                      : card.title === 'Redeem' && selectedCardSerial
                        ? `${card.href}?card=${encodeURIComponent(selectedCardSerial)}`
                        : card.href
                  }
                >
                  Open {card.title}
                </Link>
              </article>
            ))}
            <article style={launchCardStyle}>
              <strong>Sync queue</strong>
              <p style={muted}>
                Review offline work and reconcile pending cashier updates.
              </p>
              <Link href="/cashier/sync">Open sync queue</Link>
            </article>
          </div>
        </article>

        <article style={cardStyle} aria-label="Customer detail">
          <h2 style={{ marginTop: 0 }}>Customer detail</h2>
          {customerRecord ? (
            <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
              <div style={statRow}>
                <span>Name</span>
                <strong>
                  {customerRecord.fullName ?? customerRecord.name ?? '—'}
                </strong>
              </div>
              <div style={statRow}>
                <span>Status</span>
                <StatusBadge
                  label={customerRecord.status ?? 'UNKNOWN'}
                  tone="info"
                />
              </div>
              <div style={statRow}>
                <span>Balance</span>
                <Money
                  amountKobo={
                    customerRecord.balanceKobo ??
                    customerRecord.availableBalanceKobo ??
                    0
                  }
                />
              </div>
              <Separator />
              <div style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
                <strong>Recent ledger</strong>
                {Array.isArray(ledgerRecord?.items) &&
                ledgerRecord.items.length > 0 ? (
                  ledgerRecord.items.slice(0, 4).map((item) => {
                    const ledgerKey = String(
                      item.id ?? item.type ?? item.transactionType ?? 'Entry',
                    );
                    return (
                      <div key={ledgerKey} style={statRow}>
                        <span>
                          {item.type ?? item.transactionType ?? 'Entry'}
                        </span>
                        <span>
                          {item.amountKobo ? (
                            <Money amountKobo={item.amountKobo} />
                          ) : (
                            '—'
                          )}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p style={muted}>
                    Ledger history will appear once the customer is loaded.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <Alert tone="warning" title="No customer selected">
              Lookup a card first to load customer balance and history.
            </Alert>
          )}
        </article>

        <article style={cardStyle} aria-label="Shift snapshot">
          <h2 style={{ marginTop: 0 }}>Shift snapshot</h2>
          <p style={muted}>
            Offline queue state is shown in the shell header and on the sync
            route.
          </p>
          <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
            <ConnectionStatus />
            <SyncQueueIndicator />
          </div>
          <Separator style={{ margin: 'var(--sc-spacing-4) 0' }} />
          <Link href="/cashier/sync">Open sync queue</Link>
        </article>
      </div>

      <style jsx>{`
        .cashier-muted {
          color: var(--sc-color-semantic-textSecondary);
          margin: 0;
        }
      `}</style>
    </section>
  );
}

const cardStyle: CSSProperties = {
  background: 'var(--sc-color-neutral-0)',
  border: '1px solid var(--sc-color-semantic-border)',
  borderRadius: 'var(--sc-radius-lg)',
  padding: 'var(--sc-spacing-5)',
  boxShadow: 'var(--sc-shadow-level1)',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-4)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
};

const launchGridStyle: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-3)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
};

const launchCardStyle: CSSProperties = {
  border: '1px solid var(--sc-color-semantic-border)',
  borderRadius: 'var(--sc-radius-md)',
  padding: 'var(--sc-spacing-3)',
  background: 'var(--sc-color-neutral-0)',
  display: 'grid',
  gap: 'var(--sc-spacing-2)',
};

const routeRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-3)',
  flexWrap: 'wrap',
  alignItems: 'center',
};

const policyRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-2)',
  flexWrap: 'wrap',
};

const muted: CSSProperties = {
  color: 'var(--sc-color-semantic-textSecondary)',
  marginBottom: 0,
};

const statRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 'var(--sc-spacing-3)',
  alignItems: 'center',
};

const tagRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-2)',
  flexWrap: 'wrap',
};
