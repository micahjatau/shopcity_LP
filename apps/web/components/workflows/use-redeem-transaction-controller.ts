'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  redemptionsControllerRedeemV1,
  type RedeemTransactionDto,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';

function createDraftKey() {
  return crypto.randomUUID();
}

const redeemDraftStorageKey = 'shopcity-redeemdraft-v1';

type RedeemDraftState = {
  idempotencyKey: string;
  cardSerialNumber: string;
  receiptNumber: string;
  basketAmount: number | null;
  requestedRedemption: number | null;
  occurredAt: string;
};

export type RedeemPolicyContext = {
  minRedemptionKobo?: number;
  maxRedemptionBasketPercent?: number;
  redemptionApprovalThresholdKobo?: number;
  offlineRedemptionDisabled?: boolean;
};

export type RedeemLookupContext = {
  cardSerialNumber?: string;
  customerName?: string;
  availableBalanceKobo?: number | null;
  expiringCreditKobo?: number | null;
  receiptNumber?: string;
  branchId?: string | null;
};

export type RedeemTransactionControllerProps = {
  lookupContext?: RedeemLookupContext;
  policyContext?: RedeemPolicyContext | null;
  cashierId?: string | null;
  branchId?: string | null;
};

type RedeemStatus = 'idle' | 'submitting' | 'confirmed' | 'pending' | 'error';

export function useRedeemTransactionController({
  lookupContext,
  policyContext,
}: RedeemTransactionControllerProps) {
  const router = useRouter();
  const idempotencyKeyRef = useRef(createDraftKey());
  const [cardSerialNumber, setCardSerialNumber] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [basketAmount, setBasketAmount] = useState<number | null>(null);
  const [requestedRedemption, setRequestedRedemption] = useState<number | null>(
    null,
  );
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString());
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [status, setStatus] = useState<RedeemStatus>('idle');
  const [message, setMessage] = useState('');
  const [responseData, setResponseData] = useState<Record<
    string,
    unknown
  > | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(redeemDraftStorageKey);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<RedeemDraftState>;
        if (typeof draft.idempotencyKey === 'string')
          idempotencyKeyRef.current = draft.idempotencyKey;
        if (typeof draft.cardSerialNumber === 'string')
          setCardSerialNumber(draft.cardSerialNumber);
        if (typeof draft.receiptNumber === 'string')
          setReceiptNumber(draft.receiptNumber);
        if (typeof draft.basketAmount === 'number')
          setBasketAmount(draft.basketAmount);
        if (typeof draft.requestedRedemption === 'number')
          setRequestedRedemption(draft.requestedRedemption);
        if (typeof draft.occurredAt === 'string')
          setOccurredAt(draft.occurredAt);
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
      redeemDraftStorageKey,
      JSON.stringify({
        idempotencyKey: idempotencyKeyRef.current,
        cardSerialNumber,
        receiptNumber,
        basketAmount,
        requestedRedemption,
        occurredAt,
      } satisfies RedeemDraftState),
    );
  }, [
    basketAmount,
    cardSerialNumber,
    draftHydrated,
    occurredAt,
    receiptNumber,
    requestedRedemption,
  ]);

  const authoritativeCardSerial = lookupContext?.cardSerialNumber?.trim() ?? '';
  const lookupReady = Boolean(authoritativeCardSerial);
  const maxAllowedByBasketKobo =
    basketAmount === null || !policyContext?.maxRedemptionBasketPercent
      ? null
      : Math.floor(
          (basketAmount * policyContext.maxRedemptionBasketPercent) / 100,
        );
  const maxAllowedRedemptionKobo =
    typeof lookupContext?.availableBalanceKobo === 'number' &&
    maxAllowedByBasketKobo !== null
      ? Math.min(lookupContext.availableBalanceKobo, maxAllowedByBasketKobo)
      : typeof lookupContext?.availableBalanceKobo === 'number'
        ? lookupContext.availableBalanceKobo
        : maxAllowedByBasketKobo;
  const needsReview =
    typeof maxAllowedRedemptionKobo === 'number' &&
    requestedRedemption !== null &&
    requestedRedemption > maxAllowedRedemptionKobo;

  function resetDraft() {
    idempotencyKeyRef.current = createDraftKey();
    setCardSerialNumber('');
    setReceiptNumber('');
    setBasketAmount(null);
    setRequestedRedemption(null);
    setOccurredAt(new Date().toISOString());
    setStatus('idle');
    setMessage('Draft cleared.');
    setResponseData(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'submitting') return;
    setStatus('submitting');
    setMessage('Reviewing redemption…');
    setResponseData(null);
    if (!lookupReady) {
      setStatus('error');
      setMessage('Look up an active customer card before submitting.');
      return;
    }
    if (basketAmount === null || requestedRedemption === null) {
      setStatus('error');
      setMessage('Enter both basket and requested redemption amounts.');
      return;
    }

    const payload: RedeemTransactionDto = {
      cardSerialNumber: authoritativeCardSerial,
      posReceiptNumber: receiptNumber,
      basketAmountKobo: basketAmount,
      requestedRedemptionKobo: requestedRedemption,
      occurredAt,
    };
    try {
      const response = await redemptionsControllerRedeemV1(
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
            ? 'Redemption confirmed by backend contract.'
            : 'Redemption awaiting approval.',
        );
        setResponseData(
          response.data && typeof response.data === 'object'
            ? (response.data as Record<string, unknown>)
            : null,
        );
        if (typeof window !== 'undefined')
          window.localStorage.removeItem(redeemDraftStorageKey);
        idempotencyKeyRef.current = createDraftKey();
        setCardSerialNumber('');
        setReceiptNumber('');
        setBasketAmount(null);
        setRequestedRedemption(null);
        setOccurredAt(new Date().toISOString());
        router.refresh();
        return;
      }
      setStatus('error');
      setMessage(
        cashierRedeemErrorMessage(
          getResponseErrorCode(response.data),
          response.status,
        ),
      );
    } catch {
      setStatus('error');
      setMessage('Redemption could not be submitted.');
    }
  }

  return {
    authoritativeCardSerial,
    basketAmount,
    cardSerialNumber,
    handleSubmit,
    lookupReady,
    maxAllowedRedemptionKobo,
    message,
    needsReview,
    occurredAt,
    receiptNumber,
    requestedRedemption,
    resetDraft,
    responseData,
    setBasketAmount,
    setCardSerialNumber,
    setOccurredAt,
    setReceiptNumber,
    setRequestedRedemption,
    status,
  };
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

function cashierRedeemErrorMessage(code: string | null, status: number) {
  switch (code) {
    case 'INSUFFICIENT_BALANCE':
      return 'Available credit is lower than this redemption.';
    case 'REDEMPTION_TOO_LARGE':
      return 'The requested redemption exceeds the allowed basket limit.';
    case 'APPROVAL_REQUIRED':
      return 'Supervisor approval is required before this redemption can complete.';
    case 'CARD_NOT_FOUND':
    case 'CARD_INACTIVE':
      return 'This card cannot currently redeem credit. Confirm the card status.';
    case 'AUTH_SESSION_EXPIRED':
      return 'Your session has expired. Sign in again before continuing.';
    default:
      return `Redemption could not be submitted (status ${status}). Review the transaction and try again.`;
  }
}
