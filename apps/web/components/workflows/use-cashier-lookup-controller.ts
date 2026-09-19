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
};

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

  async function lookup(eventOrValue: FormEvent<HTMLFormElement> | string) {
    if (typeof eventOrValue !== 'string') eventOrValue.preventDefault();
    const query = (
      typeof eventOrValue === 'string' ? eventOrValue : lookupValue
    ).trim();
    const generation = ++requestGeneration.current;
    setLookupRecord(null);
    setDiscoveryMatches([]);
    if (!query) {
      setLookupMessage('Enter a name, phone number, or card serial.');
      return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
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
            : 'Customer search unavailable (' + response.status + ').',
        );
        return;
      }
      const data = response.data.data;
      const matches = (
        Array.isArray(data) ? data : (data.items ?? [])
      ) as CashierDiscoveryRecord[];
      setDiscoveryMatches(matches);
      setLookupMessage(
        matches.length
          ? 'Customer found. Scan or enter their active card serial to continue.'
          : 'No matching active customer or card. Check the details or ask a supervisor.',
      );
    }

    try {
      // A customer-directory match is not financial authorization. Only the
      // exact active-card endpoint can unlock Earn or Redeem.
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
        // The card could be unknown, inactive, or replaced. A directory
        // search can help identify the customer but must not unlock checkout.
        await discoverCustomer();
      } else {
        setLookupMessage(
          'Card verification unavailable (' + response.status + ').',
        );
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
    setDiscoveryMatches([]);
    setLookupPending(false);
    setLookupRecord(null);
    setLookupValue('');
    setLookupMessage('Search by name or phone, or scan an active card.');
  }

  function updateLookupValue(value: string) {
    ++requestGeneration.current;
    setLookupValue(value);
    setLookupRecord(null);
    setDiscoveryMatches([]);
    setLookupPending(false);
  }

  return {
    lookupValue,
    lookupMessage,
    lookupRecord,
    lookupPending,
    discoveryMatches,
    selectedCardSerial,
    setLookupValue: updateLookupValue,
    clearLookup,
    lookup,
  };
}
