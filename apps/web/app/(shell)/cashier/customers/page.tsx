'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  cardsControllerCreateCardV1,
  cardsControllerReplaceCardV1,
  cardsControllerUpdateStatusV1,
  customersControllerGetCustomerV1,
  customersControllerListCustomersV1,
  loyaltyControllerGetCustomerLedgerV1,
  type UpdateCardStatusDtoStatus,
} from '../../../../lib/api/generated-client';
import { createApiRequest } from '../../../../lib/api/request';
import { Alert, Button, Input, RadioGroup, Table } from '../../../../components/ui';
import { Money, StatusBadge } from '../../../../components/shopcity';

type CustomerRecord = Record<string, unknown> & {
  id?: string;
  fullName?: string;
  name?: string;
  phoneE164?: string;
  phone?: string;
  status?: string;
  balanceKobo?: number;
  cards?: unknown;
  card?: unknown;
  activeCard?: unknown;
  linkedCards?: unknown;
};

type CardRecord = Record<string, unknown> & {
  id?: string;
  serialNumber?: string;
  status?: string;
  availableBalanceKobo?: number;
};

const cardStatuses: UpdateCardStatusDtoStatus[] = ['ACTIVE', 'BLOCKED'];

export default function CashierCustomersPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('Search customers by name, phone, or ID.');
  const [items, setItems] = useState<CustomerRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [ledger, setLedger] = useState<any | null>(null);
  const [cardSerialNumber, setCardSerialNumber] = useState('');
  const [replacementSerialNumber, setReplacementSerialNumber] = useState('');
  const [cardStatus, setCardStatus] = useState<UpdateCardStatusDtoStatus>('ACTIVE');
  const [cardMessage, setCardMessage] = useState('Select a customer, then assign or manage cards.');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [replaceConfirmation, setReplaceConfirmation] = useState('');
  const [busy, setBusy] = useState(false);

  const linkedCards = useMemo(() => extractCustomerCards(customer), [customer]);
  const selectedCard = useMemo(
    () => linkedCards.find((item) => item.id === selectedCardId) ?? linkedCards[0] ?? null,
    [linkedCards, selectedCardId],
  );
  const selectedCustomer = customer;

  useEffect(() => {
    if (!selectedId) {
      setCustomer(null);
      setLedger(null);
      setSelectedCardId(null);
      return;
    }

    const customerId = selectedId;
    setSelectedCardId(null);
    let ignore = false;

    async function load() {
      try {
        const customerResponse = await customersControllerGetCustomerV1(
          customerId,
          createApiRequest({ csrf: true }),
        );
        if (!ignore && customerResponse.status === 200) {
          const nextCustomer = customerResponse.data.data as CustomerRecord;
          setCustomer(nextCustomer);
          const cards = extractCustomerCards(nextCustomer);
          setSelectedCardId(cards[0]?.id ?? null);
          if (cards[0]?.serialNumber) {
            setCardSerialNumber((current) => current || String(cards[0]?.serialNumber ?? ''));
          }
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
        const nextItems = (response.data.data.items ?? response.data.data ?? []) as CustomerRecord[];
        setItems(nextItems);
        setSelectedId(nextItems[0]?.id ?? null);
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

  async function assignCard() {
    if (!selectedId || !cardSerialNumber.trim()) {
      setCardMessage('Choose a customer and enter a card serial first.');
      return;
    }

    setBusy(true);
    setCardMessage('Assigning card…');
    try {
      const response = await cardsControllerCreateCardV1(
        { customerId: selectedId, serialNumber: cardSerialNumber.trim() },
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      setCardMessage(response.status === 201 ? 'Card assigned.' : `Assign unavailable (${response.status}).`);
      await search();
      await reloadSelectedCustomer();
    } catch {
      setCardMessage('Card assignment unavailable.');
    } finally {
      setBusy(false);
    }
  }

  async function replaceCard() {
    if (!selectedCardId || !replacementSerialNumber.trim()) {
      setCardMessage('Select a current card and enter a replacement serial first.');
      return;
    }
    if (replaceConfirmation.trim().toUpperCase() !== 'REPLACE') {
      setCardMessage('Type REPLACE to confirm the replacement.');
      return;
    }

    setBusy(true);
    setCardMessage('Replacing card…');
    try {
      const response = await cardsControllerReplaceCardV1(
        selectedCardId,
        { serialNumber: replacementSerialNumber.trim() },
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      setCardMessage(response.status === 201 ? 'Card replacement created.' : `Replacement unavailable (${response.status}).`);
      setReplacementSerialNumber('');
      setReplaceConfirmation('');
      await reloadSelectedCustomer();
    } catch {
      setCardMessage('Replacement unavailable.');
    } finally {
      setBusy(false);
    }
  }

  async function updateCardStatus() {
    if (!selectedCardId) {
      setCardMessage('Select a card first.');
      return;
    }

    setBusy(true);
    setCardMessage('Updating card status…');
    try {
      const response = await cardsControllerUpdateStatusV1(
        selectedCardId,
        { status: cardStatus },
        createApiRequest({ csrf: true, idempotencyKey: crypto.randomUUID() }),
      );
      setCardMessage(response.status === 200 ? 'Card status updated.' : `Status update unavailable (${response.status}).`);
      await reloadSelectedCustomer();
    } catch {
      setCardMessage('Status update unavailable.');
    } finally {
      setBusy(false);
    }
  }

  async function reloadSelectedCustomer() {
    if (!selectedId) return;
    try {
      const response = await customersControllerGetCustomerV1(
        selectedId,
        createApiRequest({ csrf: true }),
      );
      if (response.status === 200) {
        const nextCustomer = response.data.data as CustomerRecord;
        setCustomer(nextCustomer);
        const cards = extractCustomerCards(nextCustomer);
        setSelectedCardId((current) => current ?? cards[0]?.id ?? null);
      }
    } catch {
      // Keep current UI state.
    }
  }

  return (
    <section style={{ display: 'grid', gap: 'var(--sc-spacing-4)' }}>
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <h1 style={{ margin: 0 }}>Customers</h1>
        <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>
          Search, inspect, and trace customer balance, history, and card state.
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
      <p style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}>{cardMessage}</p>

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
                  <th>Cards</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 10).map((item) => {
                  const cards = extractCustomerCards(item);
                  return (
                    <tr key={item.id ?? item.phoneE164 ?? item.fullName}>
                      <td>
                        <button type="button" onClick={() => setSelectedId(item.id ?? null)} style={rowButton}>
                          {item.fullName ?? item.name ?? item.id}
                        </button>
                      </td>
                      <td>{item.status ?? '—'}</td>
                      <td>{typeof item.balanceKobo === 'number' ? <Money amountKobo={item.balanceKobo} /> : '—'}</td>
                      <td>{cards.length || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </article>

        <article style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Detail</h2>
          {selectedCustomer ? (
            <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
              <div style={statRow}><span>Name</span><strong>{selectedCustomer.fullName ?? selectedCustomer.name ?? selectedCustomer.id}</strong></div>
              <div style={statRow}><span>Status</span><StatusBadge label={selectedCustomer.status ?? 'UNKNOWN'} tone="info" /></div>
              <div style={statRow}><span>Balance</span><Money amountKobo={selectedCustomer.balanceKobo ?? 0} /></div>
              <div style={statRow}><span>Phone</span><span>{selectedCustomer.phoneE164 ?? selectedCustomer.phone ?? '—'}</span></div>
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

        <article style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Linked cards</h2>
          {linkedCards.length === 0 ? (
            <Alert tone="warning" title="No cards">
              This customer has no card details loaded yet.
            </Alert>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Serial</th>
                  <th>Status</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {linkedCards.map((card) => (
                  <tr key={card.id ?? card.serialNumber}>
                    <td>
                      <button type="button" onClick={() => {
                        setSelectedCardId(card.id ?? null);
                        setCardSerialNumber(card.serialNumber ?? '');
                      }} style={rowButton}>
                        {card.serialNumber ?? card.id ?? 'Card'}
                      </button>
                    </td>
                    <td><StatusBadge label={card.status ?? 'UNKNOWN'} tone={card.status === 'ACTIVE' ? 'success' : 'warning'} /></td>
                    <td>{typeof card.availableBalanceKobo === 'number' ? <Money amountKobo={card.availableBalanceKobo} /> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </article>

        <article style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Card management</h2>
          <div style={{ display: 'grid', gap: 'var(--sc-spacing-3)' }}>
            <Input aria-label="Card serial" placeholder="Card serial" value={cardSerialNumber} onChange={(event) => setCardSerialNumber(event.target.value)} />
            <Input aria-label="Replacement serial" placeholder="Replacement serial" value={replacementSerialNumber} onChange={(event) => setReplacementSerialNumber(event.target.value)} />
            <Input aria-label="Replacement confirmation" placeholder="Type REPLACE to confirm" value={replaceConfirmation} onChange={(event) => setReplaceConfirmation(event.target.value)} />
            <RadioGroup
              name="card-status"
              legend="Card status"
              value={cardStatus}
              onValueChange={(value) => setCardStatus(value as UpdateCardStatusDtoStatus)}
              options={cardStatuses.map((value) => ({ value, label: value }))}
            />
            {selectedCard ? (
              <Alert tone="info" title="Selected card">
                {selectedCard.serialNumber ?? selectedCard.id ?? 'Card'} is ready for replacement or status change.
              </Alert>
            ) : null}
            <div style={{ display: 'flex', gap: 'var(--sc-spacing-3)', flexWrap: 'wrap' }}>
              <Button onClick={() => void assignCard()} loading={busy}>Assign card</Button>
              <Button variant="secondary" onClick={() => void replaceCard()} loading={busy} disabled={!selectedCardId}>Replace card</Button>
              <Button variant="ghost" onClick={() => void updateCardStatus()} loading={busy} disabled={!selectedCardId}>Update status</Button>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function extractCustomerCards(customer: CustomerRecord | null) {
  if (!customer) return [] as CardRecord[];
  const candidates = [customer.cards, customer.linkedCards, customer.card, customer.activeCard];
  const records: CardRecord[] = [];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        const normalized = normalizeCardRecord(item);
        if (normalized) records.push(normalized);
      }
      continue;
    }

    const normalized = normalizeCardRecord(candidate);
    if (normalized) records.push(normalized);
  }

  const deduped = new Map<string, CardRecord>();
  for (const record of records) {
    const key = record.id ?? record.serialNumber ?? JSON.stringify(record);
    if (!deduped.has(key)) {
      deduped.set(key, record);
    }
  }

  return Array.from(deduped.values());
}

function normalizeCardRecord(value: unknown): CardRecord | null {
  if (!value || typeof value !== 'object') return null;
  const card = value as CardRecord;
  if (!card.id && !card.serialNumber && !card.status && typeof card.availableBalanceKobo !== 'number') {
    return null;
  }
  return card;
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
