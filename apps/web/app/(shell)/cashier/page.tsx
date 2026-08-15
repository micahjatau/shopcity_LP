'use client';

import type { CSSProperties, FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ConnectionStatus,
  OfflineIndicator,
  SyncQueueIndicator,
} from '../../../components/offline';
import { ScannerContextScope } from '../../../components/scanner-context-scope';
import { Alert, Button, Input, Separator } from '../../../components/ui';
import { Money, StatusBadge } from '../../../components/shopcity';
import {
  EarnTransactionForm,
  RedeemTransactionForm,
  WorkflowSection,
} from '../../../components/workflows';
import {
  cardsControllerLookupCardV1,
  customersControllerGetCustomerV1,
  loyaltyControllerGetCustomerLedgerV1,
} from '../../../lib/api/generated-client';
import { createApiRequest } from '../../../lib/api/request';

export default function CashierPage() {
  const [lookupValue, setLookupValue] = useState('');
  const [lookupMessage, setLookupMessage] = useState('Scan or type a card serial.');
  const [lookupRecord, setLookupRecord] = useState<any | null>(null);
  const [customerRecord, setCustomerRecord] = useState<any | null>(null);
  const [ledgerRecord, setLedgerRecord] = useState<any | null>(null);

  const customerId = useMemo(
    () => lookupRecord?.customer?.id ?? lookupRecord?.customerId ?? null,
    [lookupRecord],
  );

  useEffect(() => {
    let ignore = false;

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
          { limit: '5', cursor: '' } as any,
          createApiRequest({ csrf: true }),
        );
        if (!ignore && response.status === 200) {
          setLedgerRecord(response.data.data);
        }
      } catch {
        if (!ignore) setLedgerRecord(null);
      }
    }

    void loadCustomer();

    return () => {
      ignore = true;
    };
  }, [customerId]);

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = lookupValue.trim();
    if (!query) {
      setLookupMessage('Enter a card serial or receipt first.');
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
        setLookupMessage('Lookup resolved. Earn and redeem can now use this context.');
        return;
      }

      setLookupRecord(null);
      setLookupMessage(`Lookup unavailable (${response.status}).`);
    } catch {
      setLookupRecord(null);
      setLookupMessage('Lookup could not be completed.');
    }
  }

  const lookupSummary = lookupRecord
    ? [
        ['Customer', lookupRecord.customer?.fullName ?? lookupRecord.customerName ?? '—'],
        ['Card status', lookupRecord.status ?? lookupRecord.cardStatus ?? '—'],
        [
          'Available balance',
          lookupRecord.availableBalanceKobo ? (
            <Money amountKobo={lookupRecord.availableBalanceKobo} />
          ) : (
            '—'
          ),
        ],
        [
          'Expiring credit',
          lookupRecord.expiringCreditKobo ? (
            <Money amountKobo={lookupRecord.expiringCreditKobo} />
          ) : (
            '—'
          ),
        ],
      ]
    : [];

  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-5)' }}>
      <ScannerContextScope context="lookup" />
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Cashier shell</h1>
        <p
          style={{ color: 'var(--sc-color-semantic-textSecondary)', margin: 0 }}
        >
          Fast lookup, earn, redeem, customer detail and sync entry points.
        </p>
        <div
          style={{
            display: 'flex',
            gap: 'var(--sc-spacing-3)',
            flexWrap: 'wrap',
          }}
        >
          <ConnectionStatus />
          <SyncQueueIndicator />
          <Link href="/cashier/customers">Open customers</Link>
          <Link href="/cashier/sync">Open sync queue</Link>
        </div>
      </header>

      <OfflineIndicator />

      <WorkflowSection
        title="Primary cashier actions"
        description="Lookup now resolves context before earn/redeem; sync and customer management have their own routes."
      >
        <div
          style={{
            display: 'grid',
            gap: 'var(--sc-spacing-4)',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}
        >
          {[
            {
              title: 'Lookup',
              body: 'Scan card, receipt or customer reference.',
              href: '/cashier/customers',
            },
            {
              title: 'Earn',
              body: 'Submit a contract-backed earn transaction.',
              href: '#earn',
            },
            { title: 'Redeem', body: 'Submit a contract-backed redemption.', href: '#redeem' },
            {
              title: 'Customers',
              body: 'Check identity, cards and loyalty balance.',
              href: '/cashier/customers',
            },
            {
              title: 'Sync',
              body: 'Track local queue and reconciliation state.',
              href: '/cashier/sync',
            },
          ].map((item) => (
            <article key={item.title} style={cardStyle}>
              <strong>{item.title}</strong>
              <p style={muted}>{item.body}</p>
              <Link href={item.href}>Open</Link>
            </article>
          ))}
        </div>
      </WorkflowSection>

      <div
        style={{
          display: 'grid',
          gap: 'var(--sc-spacing-4)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        }}
      >
        <article style={cardStyle} aria-label="Lookup and status">
          <h2 style={{ marginTop: 0 }}>Lookup and status</h2>
          <form onSubmit={handleLookup} style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
            <Input
              placeholder="Scan card serial or receipt"
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
              <div style={{ display: 'flex', gap: 'var(--sc-spacing-2)', flexWrap: 'wrap' }}>
                <StatusBadge label={lookupRecord.status ?? 'LOOKUP'} tone="success" />
                {lookupRecord.customer?.id || lookupRecord.customerId ? (
                  <Link href={`/cashier/customers${lookupRecord.customer?.id || lookupRecord.customerId ? `?id=${lookupRecord.customer?.id ?? lookupRecord.customerId}` : ''}`}>
                    View customer
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </article>

        <article id="earn" style={cardStyle} aria-label="Earn transaction">
          <h2 style={{ marginTop: 0 }}>Earn transaction</h2>
          <EarnTransactionForm />
        </article>

        <article id="redeem" style={cardStyle} aria-label="Redeem transaction">
          <h2 style={{ marginTop: 0 }}>Redeem transaction</h2>
          <RedeemTransactionForm />
        </article>

        <article style={cardStyle} aria-label="Customer detail">
          <h2 style={{ marginTop: 0 }}>Customer detail</h2>
          {customerRecord ? (
            <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
              <div style={statRow}>
                <span>Name</span>
                <strong>{customerRecord.fullName ?? customerRecord.name ?? '—'}</strong>
              </div>
              <div style={statRow}>
                <span>Status</span>
                <StatusBadge label={customerRecord.status ?? 'UNKNOWN'} tone="info" />
              </div>
              <div style={statRow}>
                <span>Balance</span>
                <Money amountKobo={customerRecord.balanceKobo ?? customerRecord.availableBalanceKobo ?? 0} />
              </div>
              <Separator />
              <div style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
                <strong>Recent ledger</strong>
                {Array.isArray(ledgerRecord?.items) && ledgerRecord.items.length > 0 ? (
                  ledgerRecord.items.slice(0, 4).map((item: any) => (
                    <div key={item.id ?? JSON.stringify(item)} style={statRow}>
                      <span>{item.type ?? item.transactionType ?? 'Entry'}</span>
                      <span>{item.amountKobo ? <Money amountKobo={item.amountKobo} /> : '—'}</span>
                    </div>
                  ))
                ) : (
                  <p style={muted}>Ledger history will appear once the customer is loaded.</p>
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
          <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
            <div style={statRow}>
              <span>Pending sync</span>
              <StatusBadge label="3 saved locally" tone="warning" />
            </div>
            <div style={statRow}>
              <span>Sync health</span>
              <StatusBadge label="Stable" tone="success" />
            </div>
          </div>
          <Separator style={{ margin: 'var(--sc-spacing-4) 0' }} />
          <Link href="/cashier/sync">Open sync queue</Link>
        </article>
      </div>
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
