'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  customersControllerGetCustomerV1,
  customersControllerListCustomersV1,
  loyaltyControllerGetCustomerLedgerV1,
} from '../../../../lib/api/generated-client';
import { createApiRequest } from '../../../../lib/api/request';
import { Alert, Button, Input, Table } from '../../../../components/ui';
import { Money, StatusBadge } from '../../../../components/shopcity';

export default function CashierCustomersPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('Search customers by name, phone, or ID.');
  const [items, setItems] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<any | null>(null);
  const [ledger, setLedger] = useState<any | null>(null);

  useEffect(() => {
    if (!selectedId) {
      setCustomer(null);
      setLedger(null);
      return;
    }

    const customerId = selectedId as string;
    if (!customerId) {
      setCustomer(null);
      setLedger(null);
      return;
    }

    let ignore = false;

    async function load() {
      try {
        const customerResponse = await customersControllerGetCustomerV1(
          customerId,
          createApiRequest({ csrf: true }),
        );
        if (!ignore && customerResponse.status === 200) {
          setCustomer(customerResponse.data.data);
        }
      } catch {
        if (!ignore) setCustomer(null);
      }

      try {
        const ledgerResponse = await loyaltyControllerGetCustomerLedgerV1(
          customerId,
          { limit: '5', cursor: '' } as any,
          createApiRequest({ csrf: true }),
        );
        if (!ignore && ledgerResponse.status === 200) {
          setLedger(ledgerResponse.data.data);
        }
      } catch {
        if (!ignore) setLedger(null);
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [selectedId]);

  async function search() {
    const term = query.trim();
    setMessage(term ? `Searching for ${term}…` : 'Loading customers…');
    try {
      const response = await customersControllerListCustomersV1(
        { q: term, limit: '10' } as any,
        createApiRequest({ csrf: true }),
      );
      if (response.status === 200) {
        const nextItems = response.data.data.items ?? response.data.data ?? [];
        setItems(nextItems as any[]);
        setSelectedId((nextItems as any[])?.[0]?.id ?? null);
        setMessage(`Loaded ${nextItems.length ?? 0} customers.`);
        return;
      }
      setMessage(`Customers unavailable (${response.status}).`);
    } catch {
      setMessage('Customers unavailable.');
    }
  }

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setSelectedId(id);
    }
    void search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Customers</h1>
        <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>
          Search, inspect, and trace customer balance and history.
        </p>
        <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
          <Link href="/cashier">Back to cashier</Link>
          <Link href="/cashier/sync">Open sync queue</Link>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 'var(--sc-spacing-3)' }}>
        <Input aria-label="Customer search" placeholder="Name, phone, or ID" value={query} onChange={(event) => setQuery(event.target.value)} />
        <Button onClick={() => void search()}>Search</Button>
      </div>
      <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>{message}</p>

      <div style={{ display: 'grid', gap: 'var(--sc-spacing-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <article style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Results</h2>
          {items.length === 0 ? (
            <Alert tone="warning" title="No customers">
              No customers matched the current search.
            </Alert>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 10).map((item) => (
                  <tr key={item.id ?? item.phoneE164 ?? item.fullName}>
                    <td>
                      <button type="button" onClick={() => setSelectedId(item.id ?? null)} style={rowButton}>
                        {item.fullName ?? item.name ?? item.id}
                      </button>
                    </td>
                    <td>{item.status ?? '—'}</td>
                    <td>{typeof item.balanceKobo === 'number' ? <Money amountKobo={item.balanceKobo} /> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </article>

        <article style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Detail</h2>
          {customer ? (
            <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
              <div style={statRow}><span>Name</span><strong>{customer.fullName ?? customer.name ?? customer.id}</strong></div>
              <div style={statRow}><span>Status</span><StatusBadge label={customer.status ?? 'UNKNOWN'} tone="info" /></div>
              <div style={statRow}><span>Balance</span><Money amountKobo={customer.balanceKobo ?? 0} /></div>
              <div style={statRow}><span>Phone</span><span>{customer.phoneE164 ?? customer.phone ?? '—'}</span></div>
              <Alert tone="info" title="History">
                Recent ledger entries are shown below.
              </Alert>
              {Array.isArray(ledger?.items) && ledger.items.length > 0 ? ledger.items.slice(0, 5).map((item: any) => (
                <div key={item.id ?? JSON.stringify(item)} style={statRow}>
                  <span>{item.type ?? item.transactionType ?? 'Entry'}</span>
                  <span>{item.amountKobo ? <Money amountKobo={item.amountKobo} /> : '—'}</span>
                </div>
              )) : (
                <p style={{ color: 'var(--sc-color-semantic-textSecondary)' }}>No ledger history loaded.</p>
              )}
            </div>
          ) : (
            <Alert tone="warning" title="No customer selected">
              Select a result to load customer detail.
            </Alert>
          )}
        </article>
      </div>
    </section>
  );
}

const cardStyle = {
  border: '1px solid var(--sc-color-semantic-border)',
  borderRadius: 'var(--sc-radius-lg)',
  padding: 'var(--sc-spacing-5)',
  background: 'var(--sc-color-neutral-0)',
};

const statRow = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 'var(--sc-spacing-3)',
  alignItems: 'center',
};

const rowButton = {
  padding: 0,
  border: 0,
  background: 'transparent',
  cursor: 'pointer',
  font: 'inherit',
  textAlign: 'left' as const,
};
