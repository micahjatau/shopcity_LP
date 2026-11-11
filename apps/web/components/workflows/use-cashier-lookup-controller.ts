'use client';

import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  cardsControllerLookupCardV1,
  customersControllerListCustomersV1,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';

export type CashierLookupRecord = {
  customer?: {
    id?: string;
    customerId?: string;
    fullName?: string;
    maskedPhone?: string;
    isStaff?: boolean;
    earningEligible?: boolean;
    eligibilityReason?: string | null;
  };
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

export type CashierDiscoveryRecord = {
  id?: string;
  customerId?: string;
  fullName?: string;
  maskedPhone?: string;
  cardStatus?: string;
  availableBalanceKobo?: number;
};

export type CashierDiscoveryPage = {
  items: CashierDiscoveryRecord[];
  nextCursor: string | null;
  hasMore: boolean;
};

export function normalizeCashierDiscoveryPage(
  data: unknown,
): CashierDiscoveryPage {
  if (Array.isArray(data)) {
    return {
      items: data as CashierDiscoveryRecord[],
      nextCursor: null,
      hasMore: false,
    };
  }

  const page =
    data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const nextCursor =
    typeof page.nextCursor === 'string' && page.nextCursor
      ? page.nextCursor
      : null;

  return {
    items: Array.isArray(page.items)
      ? (page.items as CashierDiscoveryRecord[])
      : [],
    nextCursor,
    hasMore: page.hasMore === true && nextCursor !== null,
  };
}

export function useCashierLookupController(initialCardSerial?: string | null) {
  const [lookupValue, setLookupValue] = useState(initialCardSerial ?? '');
  const [lookupMessage, setLookupMessage] = useState(
    initialCardSerial
      ? 'Card context loaded from the route. Lookup to refresh if needed.'
      : 'Scan or type a card serial.',
  );
  const [lookupRecord, setLookupRecord] = useState<CashierLookupRecord | null>(
    null,
  );
  const [lookupPending, setLookupPending] = useState(false);
  const initialLookupAttempted = useRef(false);
  const requestGeneration = useRef(0);
  const [discoveryMatches, setDiscoveryMatches] = useState<
    CashierDiscoveryRecord[]
  >([]);
  const [discoveryNextCursor, setDiscoveryNextCursor] = useState<string | null>(
    null,
  );
  const [discoveryHasMore, setDiscoveryHasMore] = useState(false);
  const [discoveryPagePending, setDiscoveryPagePending] = useState(false);
  const [discoveryPageError, setDiscoveryPageError] = useState('');
  const discoveryQueryRef = useRef('');
  const discoveryPageRequestPendingRef = useRef(false);

  async function loadDiscoveryPage(cursor: string): Promise<boolean> {
    const query = discoveryQueryRef.current;
    const generation = requestGeneration.current;
    if (!query || discoveryPageRequestPendingRef.current) {
      return false;
    }

    discoveryPageRequestPendingRef.current = true;
    setDiscoveryPagePending(true);
    setDiscoveryPageError('');
    try {
      const response = await customersControllerListCustomersV1(
        { q: query, limit: '8', cursor },
        createApiRequest({ csrf: true }),
      );
      if (generation !== requestGeneration.current) return false;
      if (response.status !== 200) {
        setDiscoveryPageError(
          `Could not load customer results (${response.status}). Try again.`,
        );
        return false;
      }

      const page = normalizeCashierDiscoveryPage(response.data.data);
      setDiscoveryMatches(page.items);
      setDiscoveryNextCursor(page.nextCursor);
      setDiscoveryHasMore(page.hasMore);
      setLookupMessage(
        page.items.length
          ? 'Customer found. Scan or enter their active card serial to continue.'
          : 'No matching active customer or card. Check the details or ask a supervisor.',
      );
      return true;
    } catch {
      if (generation === requestGeneration.current) {
        setDiscoveryPageError(
          'Could not load customer results. Check the connection and retry.',
        );
      }
      return false;
    } finally {
      if (generation === requestGeneration.current) {
        discoveryPageRequestPendingRef.current = false;
        setDiscoveryPagePending(false);
      }
    }
  }

  async function lookup(eventOrValue: FormEvent<HTMLFormElement> | string) {
    if (typeof eventOrValue !== 'string') eventOrValue.preventDefault();
    const query = (
      typeof eventOrValue === 'string' ? eventOrValue : lookupValue
    ).trim();
    const generation = ++requestGeneration.current;
    discoveryQueryRef.current = query;
    discoveryPageRequestPendingRef.current = false;
    setDiscoveryNextCursor(null);
    setDiscoveryHasMore(false);
    setDiscoveryPagePending(false);
    setDiscoveryPageError('');
    setLookupRecord(null);
    setDiscoveryMatches([]);
    if (!query) {
      discoveryQueryRef.current = '';
      setLookupMessage('Enter a customer name, phone number, or card number.');
      return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      discoveryQueryRef.current = '';
      setLookupMessage(
        'Customer lookup requires a connection. Reconnect to try again.',
      );
      return;
    }
    setLookupPending(true);
    setLookupMessage('Searching for the customer…');

    async function discoverCustomer() {
      const response = await customersControllerListCustomersV1(
        { q: query, limit: '8', cursor: '' },
        createApiRequest({ csrf: true }),
      );
      if (generation !== requestGeneration.current) return;
      if (response.status !== 200) {
        setLookupMessage(
          response.status === 404
            ? 'Customer search is unavailable on this deployment. Check the API route.'
            : `Customer search unavailable (${response.status}).`,
        );
        return;
      }
      const page = normalizeCashierDiscoveryPage(response.data.data);
      const matches = page.items;
      setDiscoveryMatches(matches);
      setDiscoveryNextCursor(page.nextCursor);
      setDiscoveryHasMore(page.hasMore);
      setLookupMessage(
        matches.length
          ? 'Customer found. Scan or enter their active card serial to continue.'
          : 'No matching active customer or card. Check the details or ask a supervisor.',
      );
    }

    try {
      // Directory matches are discovery only. Exact card verification remains
      // the authority that unlocks Earn and Redeem.
      const phone = /^\+?[\d\s()]{10,}$/.test(query);
      const name =
        /^[\p{L}][\p{L} '\-]{1,}$/u.test(query) &&
        !/^(SC|CARD)[- ]/i.test(query);
      if (phone || name) {
        await discoverCustomer();
        return;
      }
      const response = await cardsControllerLookupCardV1(
        query,
        createApiRequest({ csrf: true }),
      );
      if (generation !== requestGeneration.current) return;
      if (response.status === 200) {
        setLookupRecord(response.data.data);
        setLookupMessage(
          'Active card verified. Confirm the customer to continue.',
        );
      } else if (response.status === 404) {
        await discoverCustomer();
      } else {
        setLookupMessage(`Card verification unavailable (${response.status}).`);
      }
    } catch {
      if (generation === requestGeneration.current) {
        setLookupMessage(
          'Lookup could not be completed. Check the connection and try again.',
        );
      }
    } finally {
      if (generation === requestGeneration.current) setLookupPending(false);
    }
  }

  useEffect(() => {
    if (!initialCardSerial || lookupRecord || initialLookupAttempted.current) {
      return;
    }

    initialLookupAttempted.current = true;
    setLookupValue(initialCardSerial);
    void lookup(initialCardSerial);
    // The initial route card is intentionally looked up once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCardSerial, lookupRecord]);

  const selectedCardSerial =
    lookupRecord?.serialNumber ??
    lookupRecord?.cardSerialNumber ??
    lookupValue.trim();

  function clearLookup() {
    ++requestGeneration.current;
    discoveryQueryRef.current = '';
    discoveryPageRequestPendingRef.current = false;
    setDiscoveryMatches([]);
    setDiscoveryNextCursor(null);
    setDiscoveryHasMore(false);
    setDiscoveryPagePending(false);
    setDiscoveryPageError('');
    setLookupPending(false);
    setLookupRecord(null);
    setLookupValue('');
    setLookupMessage('Search by name or phone, or scan an active card.');
  }

  function updateLookupValue(value: string) {
    ++requestGeneration.current;
    discoveryQueryRef.current = '';
    discoveryPageRequestPendingRef.current = false;
    setLookupValue(value);
    setLookupRecord(null);
    setDiscoveryMatches([]);
    setDiscoveryNextCursor(null);
    setDiscoveryHasMore(false);
    setDiscoveryPagePending(false);
    setDiscoveryPageError('');
    setLookupPending(false);
  }

  return {
    lookupValue,
    lookupMessage,
    lookupRecord,
    lookupPending,
    discoveryMatches,
    discoveryNextCursor,
    discoveryHasMore,
    discoveryPagePending,
    discoveryPageError,
    loadDiscoveryPage,
    selectedCardSerial,
    setLookupValue: updateLookupValue,
    clearLookup,
    lookup,
  };
}
