'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  loyaltyControllerEarnV1,
  type EarnTransactionDto,
} from '../../lib/api/generated-client';
import { saveOfflineEarnRecord } from '../../lib/browser/offline-earn-queue';
import { createApiRequest } from '../../lib/api/request';

function createDraftKey() {
  return crypto.randomUUID();
}

const earnDraftStorageKey = 'shopcity-earnedraft-v1';

type EarnDraftState = {
  idempotencyKey: string;
  cardSerialNumber: string;
  receiptNumber: string;
  purchaseAmount: number | null;
  occurredAt: string;
  overrideReason: string;
};

export type EarnPolicyContext = {
  defaultEarnRateBps?: number;
  purchaseFlagThresholdKobo?: number;
  purchaseApprovalThresholdKobo?: number;
  redemptionApprovalThresholdKobo?: number;
  minRedemptionKobo?: number;
  maxRedemptionBasketPercent?: number;
  offlineRedemptionDisabled?: boolean;
};

export type EarnLookupContext = {
  cardSerialNumber?: string;
  customerId?: string | null;
  customerName?: string;
  availableBalanceKobo?: number | null;
  expiringCreditKobo?: number | null;
  receiptNumber?: string;
  branchId?: string | null;
};

export type EarnTransactionControllerProps = {
  lookupContext?: EarnLookupContext;
  policyContext?: EarnPolicyContext | null;
  cashierId?: string | null;
  deviceId?: string | null;
  branchId?: string | null;
  branchTimezone?: string | null;
  receiptWeekStartDay?: number | null;
};

type EarnStatus = 'idle' | 'submitting' | 'confirmed' | 'pending' | 'error';

export function useEarnTransactionController({
  lookupContext,
  policyContext,
  cashierId,
  deviceId,
  branchId,
  branchTimezone,
  receiptWeekStartDay,
}: EarnTransactionControllerProps) {
  const router = useRouter();
  const idempotencyKeyRef = useRef(createDraftKey());
  const [cardSerialNumber, setCardSerialNumber] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState<number | null>(null);
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString());
  const [overrideReason, setOverrideReason] = useState('');
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [status, setStatus] = useState<EarnStatus>('idle');
  const [message, setMessage] = useState('');
  const [responseData, setResponseData] = useState<Record<
    string,
    unknown
  > | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(earnDraftStorageKey);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<EarnDraftState>;
        if (typeof draft.idempotencyKey === 'string')
          idempotencyKeyRef.current = draft.idempotencyKey;
        if (typeof draft.cardSerialNumber === 'string')
          setCardSerialNumber(draft.cardSerialNumber);
        if (typeof draft.receiptNumber === 'string')
          setReceiptNumber(draft.receiptNumber);
        if (typeof draft.purchaseAmount === 'number')
          setPurchaseAmount(draft.purchaseAmount);
        if (typeof draft.occurredAt === 'string')
          setOccurredAt(draft.occurredAt);
        if (typeof draft.overrideReason === 'string')
          setOverrideReason(draft.overrideReason);
      }
    } catch {
      // Ignore malformed local drafts.
    } finally {
      setDraftHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!lookupContext) return;
    if (lookupContext.cardSerialNumber)
      setCardSerialNumber(lookupContext.cardSerialNumber);
    if (lookupContext.receiptNumber)
      setReceiptNumber(lookupContext.receiptNumber);
  }, [lookupContext]);

  useEffect(() => {
    if (!draftHydrated || typeof window === 'undefined') return;
    window.localStorage.setItem(
      earnDraftStorageKey,
      JSON.stringify({
        idempotencyKey: idempotencyKeyRef.current,
        cardSerialNumber,
        receiptNumber,
        purchaseAmount,
        occurredAt,
        overrideReason,
      } satisfies EarnDraftState),
    );
  }, [
    cardSerialNumber,
    draftHydrated,
    occurredAt,
    overrideReason,
    purchaseAmount,
    receiptNumber,
  ]);

  const authoritativeCardSerial = lookupContext?.cardSerialNumber?.trim() ?? '';
  const lookupReady = Boolean(authoritativeCardSerial);
  const expectedCreditKobo =
    purchaseAmount === null || !policyContext?.defaultEarnRateBps
      ? null
      : Math.ceil((purchaseAmount * policyContext.defaultEarnRateBps) / 10000);
  const submissionReady = Boolean(
    lookupReady &&
    cardSerialNumber.trim() &&
    receiptNumber.trim() &&
    purchaseAmount !== null &&
    purchaseAmount > 0,
  );

  function resetDraft() {
    idempotencyKeyRef.current = createDraftKey();
    setCardSerialNumber('');
    setReceiptNumber('');
    setPurchaseAmount(null);
    setOccurredAt(new Date().toISOString());
    setOverrideReason('');
    setStatus('idle');
    setMessage('Draft cleared.');
    setResponseData(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'submitting') return;
    setStatus('submitting');
    setMessage('Reviewing earn transaction…');
    setResponseData(null);

    if (!lookupReady) {
      setStatus('error');
      setMessage('Look up an active customer card before submitting.');
      return;
    }
    if (!receiptNumber.trim()) {
      setStatus('error');
      setMessage('Enter a receipt number before submitting.');
      return;
    }
    if (purchaseAmount === null || purchaseAmount <= 0) {
      setStatus('error');
      setMessage('Enter a valid purchase amount before submitting.');
      return;
    }

    const payload: EarnTransactionDto = {
      cardSerialNumber: authoritativeCardSerial,
      posReceiptNumber: receiptNumber,
      purchaseAmountKobo: purchaseAmount,
      occurredAt,
      overrideReason: overrideReason.trim() || undefined,
    };

    try {
      const response = await loyaltyControllerEarnV1(
        payload,
        createApiRequest({
          csrf: true,
          idempotencyKey: idempotencyKeyRef.current,
        }),
      );
      if (response.status === 201 || response.status === 202) {
        setStatus(response.status === 201 ? 'confirmed' : 'pending');
        setMessage(
          response.status === 201
            ? 'Earn confirmed by backend contract.'
            : 'Earn awaiting approval.',
        );
        setResponseData(
          response.data && typeof response.data === 'object'
            ? response.data
            : null,
        );
        if (typeof window !== 'undefined')
          window.localStorage.removeItem(earnDraftStorageKey);
        idempotencyKeyRef.current = createDraftKey();
        setCardSerialNumber('');
        setReceiptNumber('');
        setPurchaseAmount(null);
        setOccurredAt(new Date().toISOString());
        setOverrideReason('');
        router.refresh();
        return;
      }
      setStatus('error');
      setMessage(
        cashierEarnErrorMessage(
          getResponseErrorCode(response.data),
          response.status,
        ),
      );
    } catch {
      setStatus('error');
      setMessage('Earn could not be submitted.');
      const offlineBranchId = branchId ?? lookupContext?.branchId ?? null;
      if (!deviceId || !offlineBranchId) {
        setMessage(
          'Earn could not be submitted. Offline save is unavailable until the device-bound session is ready.',
        );
        return;
      }
      try {
        const offlineResult = await saveOfflineEarnRecord({
          localId: crypto.randomUUID(),
          idempotencyKey: idempotencyKeyRef.current,
          cashierId: cashierId ?? '',
          branchId: offlineBranchId,
          deviceId,
          customerId: lookupContext?.customerId ?? undefined,
          cardBarcode: cardSerialNumber.trim(),
          receiptNumber: receiptNumber.trim(),
          receiptWeekStart: deriveReceiptWeekStart(
            branchTimezone ?? null,
            receiptWeekStartDay ?? null,
            occurredAt,
          ),
          purchaseAmountKobo: purchaseAmount ?? 0,
          occurredAtLocal: occurredAt,
          syncState: 'waiting-to-sync',
          lastError: 'Earn request failed before reaching the backend.',
          serverTransactionId: null,
          serverApprovalId: null,
        });
        if (offlineResult.ok) {
          setStatus('pending');
          setMessage('Earn could not be submitted. Saved locally for sync.');
          return;
        }
        setMessage(
          `Earn could not be saved locally for sync (${offlineResult.error}).`,
        );
      } catch {
        // Keep the network error state if offline capture fails.
      }
    }
  }

  return {
    authoritativeCardSerial,
    cardSerialNumber,
    expectedCreditKobo,
    handleSubmit,
    lookupReady,
    message,
    occurredAt,
    overrideReason,
    purchaseAmount,
    receiptNumber,
    resetDraft,
    responseData,
    setCardSerialNumber,
    setOccurredAt,
    setOverrideReason,
    setPurchaseAmount,
    setReceiptNumber,
    status,
    submissionReady,
  };
}

function deriveReceiptWeekStart(
  timezone: string | null,
  receiptWeekStartDay: number | null,
  occurredAt: string,
) {
  if (
    typeof receiptWeekStartDay !== 'number' ||
    receiptWeekStartDay < 0 ||
    receiptWeekStartDay > 6
  ) {
    return new Date(occurredAt).toISOString().slice(0, 10);
  }
  const reference = new Date(occurredAt);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone ?? 'UTC',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(reference);
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
    parts.find((part) => part.type === 'weekday')?.value ?? '',
  );
  if (weekday < 0) return new Date(occurredAt).toISOString().slice(0, 10);
  const deltaDays = (7 + weekday - receiptWeekStartDay) % 7;
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone ?? 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(reference);
  const year = Number(dateParts.find((part) => part.type === 'year')?.value);
  const month = Number(dateParts.find((part) => part.type === 'month')?.value);
  const day = Number(dateParts.find((part) => part.type === 'day')?.value);
  if (!year || !month || !day)
    return new Date(occurredAt).toISOString().slice(0, 10);
  const localDate = new Date(Date.UTC(year, month - 1, day));
  localDate.setUTCDate(localDate.getUTCDate() - deltaDays);
  return localDate.toISOString().slice(0, 10);
}

function getResponseErrorCode(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const body = value as { error?: unknown; code?: unknown };
  if (typeof body.code === 'string') return body.code;
  if (body.error && typeof body.error === 'object') {
    const nested = body.error as { code?: unknown };
    return typeof nested.code === 'string' ? nested.code : null;
  }
  return null;
}

function cashierEarnErrorMessage(code: string | null, status: number) {
  switch (code) {
    case 'RECEIPT_ALREADY_USED':
      return 'This receipt has already been used this week. Check the receipt number.';
    case 'STAFF_INELIGIBLE':
      return 'Staff purchases cannot earn ShopCity credit.';
    case 'CARD_NOT_FOUND':
    case 'CARD_INACTIVE':
      return 'This card cannot currently earn credit. Confirm the card status.';
    case 'APPROVAL_REQUIRED':
      return 'Supervisor approval is required before this earn can complete.';
    case 'INSUFFICIENT_BALANCE':
      return 'Available credit is lower than this redemption.';
    case 'AUTH_SESSION_EXPIRED':
      return 'Your session has expired. Sign in again before continuing.';
    default:
      return status === 0
        ? 'Earn could not be submitted because the network is unavailable.'
        : `Earn could not be submitted (status ${status}). Review the transaction and try again.`;
  }
}
