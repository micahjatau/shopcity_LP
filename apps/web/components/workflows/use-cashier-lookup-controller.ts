'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { cardsControllerLookupCardV1 } from '../../lib/api/generated-client';
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

  async function lookup(eventOrValue: FormEvent<HTMLFormElement> | string) {
    if (typeof eventOrValue !== 'string') {
      eventOrValue.preventDefault();
    }

    const query =
      typeof eventOrValue === 'string'
        ? eventOrValue.trim()
        : lookupValue.trim();
    if (!query) {
      setLookupMessage('Enter a card serial number first.');
      setLookupRecord(null);
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setLookupRecord(null);
      setLookupMessage('Lookup unavailable offline. Reconnect to try again.');
      return;
    }

    setLookupMessage('Looking up customer and card context…');
    setLookupPending(true);
    try {
      const response = await cardsControllerLookupCardV1(
        query,
        createApiRequest({ csrf: true }),
      );

      if (response.status === 200) {
        setLookupRecord(response.data.data);
        setLookupMessage(
          'Lookup resolved. The workflow can now use this context.',
        );
        return;
      }

      setLookupRecord(null);
      setLookupMessage(`Lookup unavailable (${response.status}).`);
    } catch {
      setLookupRecord(null);
      setLookupMessage('Lookup could not be completed.');
    } finally {
      setLookupPending(false);
    }
  }

  useEffect(() => {
    if (!initialCardSerial || lookupRecord) {
      return;
    }

    setLookupValue(initialCardSerial);
    void lookup(initialCardSerial);
    // The initial route card is intentionally looked up once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCardSerial, lookupRecord]);

  const selectedCardSerial =
    lookupRecord?.serialNumber ??
    lookupRecord?.cardSerialNumber ??
    lookupValue.trim();

  return {
    lookupValue,
    lookupMessage,
    lookupRecord,
    lookupPending,
    selectedCardSerial,
    setLookupValue,
    lookup,
  };
}
