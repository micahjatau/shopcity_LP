'use client';

import { ChevronLeft, ChevronRight, Search, ScanLine } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Fragment, type FormEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  customersControllerGetCustomerV1,
  customersControllerListCustomersV1,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { useSessionBootstrapState } from '../session-bootstrap';
import { ScannerContextScope } from '../scanner-context-scope';
import { Button, Input } from '../ui';
import { CashierFlowPanel, CashierPageHeader, Money } from '../shopcity';
import { EarnTransactionForm, RedeemTransactionForm } from './index';
import {
  useCashierLookupController,
  normalizeCashierDiscoveryPage,
  type CashierDiscoveryRecord,
  type CashierLookupRecord,
} from './use-cashier-lookup-controller';
import { VerifiedCardLookupStep } from './verified-card-lookup-step';
import { RecentCashierCaptures } from './recent-cashier-captures';
import { RecentCashierRedemptions } from './recent-cashier-redemptions';
import { SupervisorVirtualCardPreview } from './supervisor-virtual-card-preview';

/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- the progress track is horizontally scrollable on narrow screens. */

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
    offlineRedemptionDisabled?: boolean;
  };
};

export type CashierWorkflowRouteProps = {
  kind: 'lookup' | 'earn' | 'redeem';
  title: string;
  description: string;
  initialCardSerial?: string | null;
};

export function CashierWorkflowRoute({
  kind,
  title,
  description,
  initialCardSerial,
}: Readonly<CashierWorkflowRouteProps>) {
  const {
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
    setLookupValue,
    clearLookup,
    lookup: handleLookup,
  } = useCashierLookupController(initialCardSerial);
  const {
    userId,
    deviceId,
    sessionLabel,
    publicConfig,
    configMessage: policyMessage,
  } = useSessionBootstrapState();
  const policyConfig = publicConfig as CashierPolicyConfig | null;
  const [flowStep, setFlowStep] = useState(0);
  const [earnConfirmed, setEarnConfirmed] = useState(false);
  const [lookupEmailSummary, setLookupEmailSummary] = useState<{
    customerId: string;
    email: string | null;
    availableBalanceKobo: number | null;
  } | null>(null);
  const lookupCustomerId =
    lookupRecord?.customer?.customerId ??
    lookupRecord?.customer?.id ??
    lookupRecord?.customerId;

  useEffect(() => {
    if (!lookupCustomerId) {
      setLookupEmailSummary(null);
      return;
    }

    let active = true;
    setLookupEmailSummary(null);
    void customersControllerGetCustomerV1(
      lookupCustomerId,
      createApiRequest({ csrf: true }),
    )
      .then((response) => {
        if (!active) return;
        const customer = response.status === 200 ? response.data.data : null;
        const customerMatches = customer?.customerId === lookupCustomerId;
        setLookupEmailSummary({
          customerId: lookupCustomerId,
          email: customerMatches ? (customer.email ?? null) : null,
          availableBalanceKobo:
            customerMatches && typeof customer.availableBalanceKobo === 'number'
              ? customer.availableBalanceKobo
              : null,
        });
      })
      .catch(() => {
        if (active)
          setLookupEmailSummary({
            customerId: lookupCustomerId,
            email: null,
            availableBalanceKobo: null,
          });
      });

    return () => {
      active = false;
    };
  }, [lookupCustomerId]);

  const cardStatus = lookupRecord?.status ?? lookupRecord?.cardStatus ?? '';
  const email =
    lookupCustomerId && lookupEmailSummary?.customerId === lookupCustomerId
      ? (lookupEmailSummary?.email ?? 'Not provided')
      : lookupCustomerId
        ? 'Loading…'
        : 'Not provided';
  const walletBalanceKobo =
    lookupRecord?.availableBalanceKobo ??
    lookupRecord?.balanceKobo ??
    (lookupCustomerId && lookupEmailSummary?.customerId === lookupCustomerId
      ? lookupEmailSummary?.availableBalanceKobo
      : null);
  const policyContext = policyConfig?.policies ?? null;
  const branchContext = policyConfig?.branch ?? null;
  const branchReceiptWeekStartDay =
    typeof branchContext?.receiptWeekStartDay === 'number'
      ? branchContext.receiptWeekStartDay
      : null;
  const lookupContext = lookupRecord
    ? {
        cardSerialNumber:
          lookupRecord.serialNumber ??
          lookupRecord.cardSerialNumber ??
          lookupValue.trim(),
        customerId:
          lookupRecord.customer?.customerId ??
          lookupRecord.customer?.id ??
          lookupRecord.customerId,
        customerName:
          lookupRecord.customer?.fullName ?? lookupRecord.customerName,
        availableBalanceKobo:
          lookupRecord.availableBalanceKobo ?? lookupRecord.balanceKobo,
        expiringCreditKobo: lookupRecord.expiringCreditKobo,
        branchId: lookupRecord.branchId ?? branchContext?.id,
      }
    : undefined;
  const currentFlowStep =
    kind === 'earn'
      ? !lookupRecord
        ? 0
        : !earnConfirmed
          ? 1
          : flowStep
      : kind === 'redeem'
        ? !lookupRecord
          ? 0
          : flowStep
        : 0;
  const flowSteps =
    kind === 'earn'
      ? ['Find Customer', 'Confirm Customer', 'Receipt Details', 'Review']
      : [
          'Find Customer',
          'Basket Total',
          'Redemption amount',
          'Confirm Redemption',
        ];
  const usesCaptureProgress = kind === 'earn' || kind === 'redeem';
  const routeHeader = (
    <CashierPageHeader
      className="cashier-route-header"
      dataOdId={
        kind === 'lookup'
          ? 'find-customer-heading'
          : kind === 'earn'
            ? 'capture-purchase-heading'
            : 'redeem-heading'
      }
      title={title}
      description={description}
    />
  );

  return (
    <section
      className={`cashier-route-page cashier-route-page--${kind}`}
      data-od-id={kind === 'earn' ? 'capture-purchase-page' : `${kind}-page`}
    >
      <ScannerContextScope context="lookup" />
      {routeHeader}
      {kind !== 'lookup' ? (
        <div
          role="region"
          className={`cashier-flow-steps ${
            usesCaptureProgress ? 'cashier-flow-steps--capture' : ''
          }`}
          aria-label={`${title} steps`}
          tabIndex={usesCaptureProgress ? 0 : undefined}
          data-od-id={kind === 'earn' ? 'capture-stages' : 'redeem-stages'}
        >
          {usesCaptureProgress ? (
            <div className="cashier-flow-steps__track">
              {flowSteps.map((step, index) => (
                <Fragment key={step}>
                  <span
                    className={`cashier-flow-step ${
                      index === currentFlowStep ? 'is-active' : ''
                    } ${index < currentFlowStep ? 'is-complete' : ''}`}
                    aria-current={
                      index === currentFlowStep ? 'step' : undefined
                    }
                  >
                    {index < currentFlowStep ? (
                      <span
                        className="cashier-flow-step__icon"
                        aria-hidden="true"
                      >
                        <Image
                          src="/brand/cashier/cashier-capture-step-check.svg"
                          alt=""
                          width={13}
                          height={13}
                        />
                      </span>
                    ) : null}
                    <span>{step}</span>
                  </span>
                  {index < flowSteps.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className={`cashier-flow-connector ${
                        index < currentFlowStep ? 'is-complete' : ''
                      }`}
                    >
                      <Image
                        src={`/brand/cashier/cashier-capture-step-connector-${
                          index < currentFlowStep ? 'active' : 'inactive'
                        }.svg`}
                        alt=""
                        width={24}
                        height={1}
                      />
                    </span>
                  ) : null}
                </Fragment>
              ))}
            </div>
          ) : (
            flowSteps.map((step, index) => (
              <span
                className={`cashier-flow-step ${
                  index === currentFlowStep ? 'is-active' : ''
                } ${index < currentFlowStep ? 'is-complete' : ''}`}
                aria-current={index === currentFlowStep ? 'step' : undefined}
                key={step}
              >
                <b aria-hidden="true">
                  {index < currentFlowStep ? '✓' : index + 1}
                </b>
                <span>{step}</span>
              </span>
            ))
          )}
        </div>
      ) : null}
      {kind === 'lookup' ? (
        <FindCustomerView
          lookupValue={lookupValue}
          lookupMessage={lookupMessage}
          lookupPending={lookupPending}
          lookupRecord={lookupRecord}
          discoveryMatches={discoveryMatches}
          discoveryNextCursor={discoveryNextCursor}
          discoveryHasMore={discoveryHasMore}
          discoveryPagePending={discoveryPagePending}
          discoveryPageError={discoveryPageError}
          onLoadDiscoveryPage={loadDiscoveryPage}
          onLookup={(eventOrValue) => void handleLookup(eventOrValue)}
          onQueryChange={setLookupValue}
          selectedCardSerial={selectedCardSerial}
          onClearLookup={clearLookup}
        />
      ) : kind === 'earn' ? (
        <CashierFlowPanel
          flow="earn"
          state={`step-${Math.min(currentFlowStep + 1, flowSteps.length)}`}
          className="cashier-flow-panel cashier-earn-workflow-panel"
          dataOdId="capture-flow"
        >
          {!lookupRecord ? (
            <>
              <VerifiedCardLookupStep
                lookupValue={lookupValue}
                lookupMessage={lookupMessage}
                lookupPending={lookupPending}
                policyMessage={policyMessage}
                onLookup={(event) => void handleLookup(event)}
                onQueryChange={setLookupValue}
                captureLayout
              />
              <RecentCashierCaptures />
            </>
          ) : !earnConfirmed ? (
            <div
              className="cashier-stage-content cashier-confirm-stage"
              data-od-id="capture-confirm-customer"
              aria-label="Confirm customer"
            >
              <div className="cashier-stage-heading">
                <h2 className="cashier-stage-heading-title">
                  Step 2 — Confirm customer
                </h2>
                <p className="cashier-stage-heading-description">
                  Read the name back to the customer before continuing.
                </p>
                <Image
                  src="/brand/cashier/cashier-confirmation-divider.svg"
                  alt=""
                  aria-hidden="true"
                  width={664}
                  height={1}
                  className="cashier-capture-confirm__divider"
                />
              </div>
              <CaptureCustomerConfirmationCard
                customerName={
                  lookupContext?.customerName ??
                  lookupRecord.customer?.fullName ??
                  lookupRecord.customerName
                }
                maskedPhone={lookupRecord.customer?.maskedPhone}
                maskedEmail={email}
                cardStatus={cardStatus}
                walletBalanceKobo={walletBalanceKobo}
                cardSerialNumber={
                  lookupContext?.cardSerialNumber ?? lookupRecord.serialNumber
                }
              />
              <div className="cashier-stage-actions">
                <Button
                  type="button"
                  variant="secondary"
                  aria-label="Go back to find customer"
                  className="cashier-capture-confirm__back sc-button--cashier-confirm-action sc-button--cashier-confirm-back"
                  onClick={() => {
                    clearLookup();
                    setEarnConfirmed(false);
                  }}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  className="cashier-capture-confirm__proceed sc-button--cashier-confirm-action sc-button--cashier-confirm-proceed"
                  onClick={() => setEarnConfirmed(true)}
                >
                  Proceed
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="cashier-flow-panel-form"
              data-od-id="capture-flow-form"
            >
              <EarnTransactionForm
                lookupContext={lookupContext}
                currentWalletBalanceKobo={walletBalanceKobo ?? null}
                policyContext={policyContext}
                cashierId={userId}
                cashierDisplayName={
                  sessionLabel?.split(' · ').slice(1).join(' · ').trim() ||
                  'Cashier'
                }
                deviceId={deviceId}
                branchId={policyConfig?.branch?.id ?? null}
                branchTimezone={branchContext?.timezone ?? null}
                receiptWeekStartDay={branchReceiptWeekStartDay}
                onFlowStepChange={setFlowStep}
                onBackToCustomerConfirmation={() => setEarnConfirmed(false)}
              />
            </div>
          )}
        </CashierFlowPanel>
      ) : (
        <CashierFlowPanel
          flow="redeem"
          state={`step-${Math.min(currentFlowStep + 1, flowSteps.length)}`}
          className="cashier-flow-panel cashier-redeem-flow-panel"
          dataOdId="redeem-flow"
        >
          {!lookupRecord ? (
            <>
              <VerifiedCardLookupStep
                lookupValue={lookupValue}
                lookupMessage={lookupMessage}
                lookupPending={lookupPending}
                policyMessage={policyMessage}
                onLookup={(event) => void handleLookup(event)}
                onQueryChange={setLookupValue}
                captureLayout
              />
              <RecentCashierRedemptions />
            </>
          ) : (
            <RedeemTransactionForm
              lookupContext={
                lookupContext
                  ? {
                      ...lookupContext,
                      maskedPhone: lookupRecord.customer?.maskedPhone,
                      maskedEmail: email === 'Loading…' ? undefined : email,
                      cardStatus,
                      availableBalanceKobo: walletBalanceKobo,
                    }
                  : undefined
              }
              policyContext={policyContext}
              cashierId={userId}
              cashierDisplayName={
                sessionLabel?.split(' · ').slice(1).join(' · ').trim() ||
                'Cashier'
              }
              branchId={policyConfig?.branch?.id ?? null}
              onFlowStepChange={setFlowStep}
              onBackToLookup={() => {
                clearLookup();
                setFlowStep(0);
              }}
            />
          )}
        </CashierFlowPanel>
      )}
    </section>
  );
}

function getCaptureCardStatus(status: string) {
  const normalized = status.trim().toUpperCase();
  if (normalized === 'ACTIVE')
    return { label: 'Active', tone: 'active' as const };
  if (normalized === 'BLOCKED')
    return { label: 'Blocked', tone: 'blocked' as const };
  if (normalized === 'LOST') return { label: 'Lost', tone: 'lost' as const };
  if (normalized === 'REPLACED')
    return { label: 'Replaced', tone: 'inactive' as const };
  if (normalized === 'INACTIVE')
    return { label: 'Inactive', tone: 'inactive' as const };
  return {
    label: status || 'Not provided',
    tone: 'inactive' as const,
  };
}

function CaptureCustomerConfirmationCard({
  customerName,
  maskedPhone,
  maskedEmail,
  cardStatus,
  walletBalanceKobo,
  cardSerialNumber,
}: Readonly<{
  customerName?: string;
  maskedPhone?: string;
  maskedEmail: string;
  cardStatus: string;
  walletBalanceKobo?: number | null;
  cardSerialNumber?: string;
}>) {
  const [copyMessage, setCopyMessage] = useState('');
  const displayName = customerName?.trim() || 'Not provided';
  const cardStatusDisplay = getCaptureCardStatus(cardStatus);
  const serialNumber = cardSerialNumber?.trim() || 'Not provided';
  const canCopySerial = serialNumber !== 'Not provided';
  const isEmailLoading = maskedEmail === 'Loading…';

  async function copySerialNumber() {
    if (!canCopySerial) return;
    try {
      await navigator.clipboard.writeText(serialNumber);
      setCopyMessage('Card number copied.');
    } catch {
      setCopyMessage('Could not copy card number. Select the value manually.');
    }
  }

  return (
    <div
      className="cashier-capture-confirm-layout"
      role="group"
      aria-label="Verified customer details"
    >
      <div className="cashier-capture-confirm__identity">
        <dl className="cashier-capture-confirm__details">
          <div className="cashier-capture-confirm__field--customer">
            <dt>Customer</dt>
            <dd className={displayName === 'Not provided' ? 'is-missing' : ''}>
              {displayName}
            </dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd
              className={`cashier-capture-confirm__email ${maskedEmail === 'Not provided' ? 'is-missing' : ''}`}
              aria-busy={isEmailLoading}
            >
              {isEmailLoading ? (
                <span
                  className="cashier-capture-confirm__email-skeleton"
                  role="status"
                  aria-label="Loading customer email"
                />
              ) : (
                maskedEmail || 'Not provided'
              )}
            </dd>
          </div>
          <div>
            <dt>Phone number</dt>
            <dd
              className={`cashier-capture-confirm__phone ${maskedPhone ? '' : 'is-missing'}`}
            >
              {maskedPhone || 'Not provided'}
            </dd>
          </div>
          <div className="cashier-capture-confirm__serial">
            <dt>Virtual Card Number</dt>
            <dd>
              <span className={canCopySerial ? '' : 'is-missing'}>
                {serialNumber}
              </span>
              {canCopySerial ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="compact"
                  className="cashier-capture-confirm__copy"
                  aria-label={`Copy virtual card number ${serialNumber}`}
                  title="Copy virtual card number"
                  onClick={() => void copySerialNumber()}
                >
                  <Image
                    src="/brand/cashier/cashier-confirmation-copy.svg"
                    alt=""
                    aria-hidden="true"
                    width={16}
                    height={16}
                  />
                </Button>
              ) : null}
              <span className="sr-only" aria-live="polite">
                {copyMessage}
              </span>
            </dd>
          </div>
          <div className="cashier-capture-confirm__wallet">
            <dt>Wallet Balance</dt>
            <dd
              className={`cashier-capture-confirm__wallet-value ${typeof walletBalanceKobo === 'number' ? '' : 'is-missing'}`}
            >
              {typeof walletBalanceKobo === 'number' ? (
                <Money amountKobo={walletBalanceKobo} />
              ) : (
                'Not provided'
              )}
            </dd>
          </div>
        </dl>
      </div>
      <div className="cashier-capture-card-preview">
        <SupervisorVirtualCardPreview
          confirmation
          customerName={displayName}
          serialNumber={serialNumber}
          status={cardStatusDisplay.label}
        />
        <p className="cashier-capture-card-preview__status">
          Status: {cardStatusDisplay.label}
        </p>
      </div>
    </div>
  );
}

function FindCustomerView({
  lookupValue,
  lookupMessage,
  lookupPending,
  lookupRecord,
  discoveryMatches,
  discoveryNextCursor,
  discoveryHasMore,
  discoveryPagePending,
  discoveryPageError,
  onLoadDiscoveryPage,
  onLookup,
  onQueryChange,
  selectedCardSerial,
  onClearLookup,
}: Readonly<{
  lookupValue: string;
  lookupMessage: string;
  lookupPending: boolean;
  lookupRecord: CashierLookupRecord | null;
  discoveryMatches: CashierDiscoveryRecord[];
  discoveryNextCursor: string | null;
  discoveryHasMore: boolean;
  discoveryPagePending: boolean;
  discoveryPageError: string;
  onLoadDiscoveryPage: (cursor: string) => Promise<boolean>;
  onLookup: (eventOrValue: FormEvent<HTMLFormElement> | string) => void;
  onQueryChange: (value: string) => void;
  selectedCardSerial: string;
  onClearLookup: () => void;
}>) {
  const queryInputRef = useRef<HTMLInputElement | null>(null);
  const lookupHandlerRef = useRef(onLookup);
  const previousLookupValue = useRef(lookupValue);
  const searchTimerRef = useRef<number | null>(null);
  const triggeredSearchRef = useRef('');
  const scrollRegionProps = { tabIndex: 0 };
  const [recentCustomers, setRecentCustomers] = useState<
    CashierDiscoveryRecord[]
  >([]);
  const [recentPending, setRecentPending] = useState(true);
  const [recentError, setRecentError] = useState('');
  const [recentPage, setRecentPage] = useState(1);
  const [recentCursorHistory, setRecentCursorHistory] = useState<string[]>([
    '',
  ]);
  const [recentNextCursor, setRecentNextCursor] = useState<string | null>(null);
  const [recentHasMore, setRecentHasMore] = useState(false);
  const [recentRetryPage, setRecentRetryPage] = useState<{
    cursor: string;
    page: number;
  } | null>(null);
  const recentRequestGeneration = useRef(0);
  const recentPagePendingRef = useRef(false);
  const [searchPage, setSearchPage] = useState(1);
  const [searchCursorHistory, setSearchCursorHistory] = useState<string[]>([
    '',
  ]);
  const [searchRetryPage, setSearchRetryPage] = useState<{
    cursor: string;
    page: number;
  } | null>(null);
  const searchQueryRef = useRef(lookupValue.trim());
  searchQueryRef.current = lookupValue.trim();
  const [directoryPending, setDirectoryPending] = useState(false);

  useEffect(() => {
    lookupHandlerRef.current = onLookup;
  }, [onLookup]);

  const loadRecentPage = useCallback(
    async (cursor: string, targetPage: number): Promise<boolean> => {
      if (recentPagePendingRef.current) return false;
      const generation = ++recentRequestGeneration.current;
      recentPagePendingRef.current = true;
      setRecentPending(true);
      setRecentError('');

      try {
        const response = await customersControllerListCustomersV1(
          { q: '', limit: '10', cursor },
          createApiRequest({ csrf: true }),
        );
        if (generation !== recentRequestGeneration.current) return false;
        if (response.status !== 200) {
          setRecentError(`Recent customers unavailable (${response.status}).`);
          setRecentRetryPage({ cursor, page: targetPage });
          return false;
        }

        const page = normalizeCashierDiscoveryPage(response.data.data);
        setRecentCustomers(page.items);
        setRecentNextCursor(page.nextCursor);
        setRecentHasMore(page.hasMore);
        setRecentPage(targetPage);
        setRecentCursorHistory((current) => {
          const history = current.slice(0, targetPage - 1);
          history[targetPage - 1] = cursor;
          return history;
        });
        setRecentRetryPage(null);
        return true;
      } catch {
        if (generation === recentRequestGeneration.current) {
          setRecentError(
            'Recent customers unavailable. Check the connection and retry.',
          );
          setRecentRetryPage({ cursor, page: targetPage });
        }
        return false;
      } finally {
        if (generation === recentRequestGeneration.current) {
          recentPagePendingRef.current = false;
          setRecentPending(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadRecentPage('', 1);
    return () => {
      recentRequestGeneration.current += 1;
    };
  }, [loadRecentPage]);

  useEffect(() => {
    if (lookupValue === previousLookupValue.current) return;
    previousLookupValue.current = lookupValue;
    setSearchPage(1);
    setSearchCursorHistory(['']);
    setSearchRetryPage(null);
    const term = lookupValue.trim();
    if (term.length < 2) {
      triggeredSearchRef.current = '';
      setDirectoryPending(false);
      return;
    }

    setDirectoryPending(true);
    const timer = window.setTimeout(() => {
      searchTimerRef.current = null;
      triggeredSearchRef.current = term;
      lookupHandlerRef.current(term);
    }, 280);
    searchTimerRef.current = timer;

    return () => {
      window.clearTimeout(timer);
      if (searchTimerRef.current === timer) searchTimerRef.current = null;
    };
  }, [lookupValue]);

  useEffect(() => {
    if (
      triggeredSearchRef.current &&
      triggeredSearchRef.current === lookupValue.trim() &&
      !lookupPending
    ) {
      setDirectoryPending(false);
      triggeredSearchRef.current = '';
    }
  }, [lookupPending, lookupValue]);

  useEffect(() => {
    function restoreLookupFocus(event: KeyboardEvent) {
      if (
        event.key !== 'Escape' ||
        (!lookupValue && !lookupRecord && discoveryMatches.length === 0)
      ) {
        return;
      }
      event.preventDefault();
      onClearLookup();
      queryInputRef.current?.focus();
    }

    window.addEventListener('keydown', restoreLookupFocus);
    return () => window.removeEventListener('keydown', restoreLookupFocus);
  }, [discoveryMatches.length, lookupRecord, lookupValue, onClearLookup]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    if (searchTimerRef.current !== null) {
      window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    const term = lookupValue.trim();
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    setSearchPage(1);
    setSearchCursorHistory(['']);
    setSearchRetryPage(null);
    if (term.length >= 2) {
      triggeredSearchRef.current = offline ? '' : term;
      setDirectoryPending(!offline);
    }
    lookupHandlerRef.current(event);
  }

  const verifiedCustomer: CashierDiscoveryRecord | null = lookupRecord
    ? {
        customerId:
          lookupRecord.customerId ??
          lookupRecord.customer?.customerId ??
          lookupRecord.customer?.id,
        fullName: lookupRecord.customer?.fullName ?? lookupRecord.customerName,
        maskedPhone: lookupRecord.customer?.maskedPhone,
        cardStatus: lookupRecord.cardStatus ?? lookupRecord.status,
        availableBalanceKobo:
          lookupRecord.availableBalanceKobo ?? lookupRecord.balanceKobo,
      }
    : null;
  const hasSearchTerm = Boolean(lookupValue.trim());
  const visibleCustomers = verifiedCustomer
    ? [verifiedCustomer]
    : hasSearchTerm
      ? discoveryMatches
      : recentCustomers;
  const tableBusy = hasSearchTerm
    ? lookupPending || directoryPending || discoveryPagePending
    : recentPending;
  const statusMessage = hasSearchTerm
    ? lookupValue.trim().length < 2 && !lookupPending
      ? 'Enter at least 2 characters to search.'
      : directoryPending && !lookupPending
        ? `Searching for “${lookupValue.trim()}”…`
        : discoveryPagePending
          ? `Loading customer results page ${searchPage + 1}…`
          : lookupMessage
    : recentPending
      ? recentCustomers.length
        ? 'Loading another customer page…'
        : 'Loading recent customers…'
      : recentError;
  const searchingResults = hasSearchTerm && !verifiedCustomer;
  const currentPage = searchingResults ? searchPage : recentPage;
  const canGoPrevious = currentPage > 1;
  const canGoNext = searchingResults
    ? discoveryHasMore && Boolean(discoveryNextCursor)
    : recentHasMore && Boolean(recentNextCursor);
  const paginationBusy = searchingResults
    ? lookupPending || directoryPending || discoveryPagePending
    : recentPending;
  const showPagination = !verifiedCustomer && (canGoPrevious || canGoNext);

  async function loadSearchPage(cursor: string, targetPage: number) {
    const query = searchQueryRef.current;
    const loaded = await onLoadDiscoveryPage(cursor);
    if (searchQueryRef.current !== query) return;
    if (loaded) {
      setSearchPage(targetPage);
      setSearchCursorHistory((current) => {
        const history = current.slice(0, targetPage - 1);
        history[targetPage - 1] = cursor;
        return history;
      });
      setSearchRetryPage(null);
    } else {
      setSearchRetryPage({ cursor, page: targetPage });
    }
  }

  function loadNextPage() {
    if (searchingResults) {
      const cursor = searchCursorHistory[searchPage] ?? discoveryNextCursor;
      if (cursor) void loadSearchPage(cursor, searchPage + 1);
      return;
    }
    const cursor = recentCursorHistory[recentPage] ?? recentNextCursor;
    if (cursor) void loadRecentPage(cursor, recentPage + 1);
  }

  function loadPreviousPage() {
    const targetPage = currentPage - 1;
    if (targetPage < 1) return;
    if (searchingResults) {
      void loadSearchPage(
        searchCursorHistory[targetPage - 1] ?? '',
        targetPage,
      );
      return;
    }
    void loadRecentPage(recentCursorHistory[targetPage - 1] ?? '', targetPage);
  }

  function retryFailedPage() {
    if (searchingResults && searchRetryPage) {
      void loadSearchPage(searchRetryPage.cursor, searchRetryPage.page);
      return;
    }
    if (!searchingResults && recentRetryPage) {
      void loadRecentPage(recentRetryPage.cursor, recentRetryPage.page);
    }
  }

  const pageError = searchingResults ? discoveryPageError : recentError;
  const retryPage = searchingResults ? searchRetryPage : recentRetryPage;

  return (
    <div className="find-customer-view" data-od-id="find-customer-content">
      <header
        className="find-customer-recent-head"
        data-od-id="recent-customers-heading"
      >
        <h2
          className="sc-discovery-section-title"
          id="find-customer-results-title"
        >
          Recent customers
        </h2>
        <p className="sc-discovery-muted">
          Browse recently registered customer profiles.
        </p>
      </header>
      <section
        className="find-customer-search sc-discovery-panel"
        data-od-id="customer-search"
        aria-busy={lookupPending || directoryPending}
      >
        <form id="customer-search-form" onSubmit={submitSearch}>
          <div className="find-customer-search-row">
            <label
              className="find-customer-query table-search"
              htmlFor="customer-search-query"
            >
              <Search aria-hidden="true" size={16} strokeWidth={1.8} />
              <Input
                ref={queryInputRef}
                id="customer-search-query"
                type="search"
                aria-label="Customer search"
                placeholder="Search customers, phone, or card…"
                autoComplete="off"
                className="sc-input--compact"
                value={lookupValue}
                onChange={(event) => onQueryChange(event.target.value)}
              />
            </label>
            <Button
              type="submit"
              disabled={lookupPending}
              className="find-customer-search-action find-customer-search-action--primary"
              data-od-id="customer-search-button"
            >
              <Search aria-hidden="true" size={16} strokeWidth={1.8} />
              {lookupPending ? 'Searching…' : 'Search'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="find-customer-search-action find-customer-search-action--secondary"
              data-od-id="customer-scan-button"
              onClick={() => queryInputRef.current?.focus()}
            >
              <ScanLine aria-hidden="true" size={16} strokeWidth={1.8} />
              Scan
            </Button>
          </div>
        </form>
      </section>

      {statusMessage ? (
        <p
          className="find-customer-notice sc-discovery-muted"
          data-od-id="customer-search-state"
          role="status"
          aria-live="polite"
        >
          {statusMessage}
        </p>
      ) : null}

      <section
        className="find-customer-recent sc-discovery-panel"
        data-od-id="recent-customers"
        aria-labelledby="find-customer-results-title"
        aria-busy={tableBusy}
      >
        <div
          className="find-customer-table-wrap"
          data-od-id="customer-results"
          role="region"
          aria-label="Customer results"
          {...scrollRegionProps}
        >
          <table className="find-customer-table">
            <caption className="sr-only">
              Customer name, masked phone, card status, available balance, and
              profile action.
            </caption>
            <thead>
              <tr>
                <th scope="col">Customer</th>
                <th scope="col">Phone</th>
                <th scope="col">Card status</th>
                <th scope="col">Available balance</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleCustomers.length ? (
                visibleCustomers.map((customer, index) => {
                  const customerId = customer.customerId ?? customer.id;
                  const customerName = customer.fullName ?? 'Name unavailable';
                  const profileQuery = customerId
                    ? new URLSearchParams({ id: customerId })
                    : null;
                  if (profileQuery && verifiedCustomer && selectedCardSerial) {
                    profileQuery.set('card', selectedCardSerial);
                  }
                  const normalizedCardStatus = customer.cardStatus
                    ?.trim()
                    .toUpperCase();
                  const cardStatus =
                    normalizedCardStatus === 'ACTIVE'
                      ? 'Active card'
                      : customer.cardStatus
                        ? customer.cardStatus
                            .replaceAll('_', ' ')
                            .toLowerCase()
                            .replace(/^\w/, (letter) => letter.toUpperCase())
                        : 'Card status unavailable';
                  const cardStatusTone =
                    normalizedCardStatus === 'ACTIVE'
                      ? 'active'
                      : ['PENDING', 'ISSUING'].includes(
                            normalizedCardStatus ?? '',
                          )
                        ? 'pending'
                        : [
                              'BLOCKED',
                              'CANCELLED',
                              'DEACTIVATED',
                              'EXPIRED',
                              'INACTIVE',
                              'LOST',
                              'REVOKED',
                              'SUSPENDED',
                            ].includes(normalizedCardStatus ?? '')
                          ? 'inactive'
                          : 'unknown';
                  const balanceKobo = customer.availableBalanceKobo;
                  const balanceTone =
                    typeof balanceKobo !== 'number' ||
                    !Number.isFinite(balanceKobo)
                      ? 'unknown'
                      : balanceKobo > 0
                        ? 'positive'
                        : balanceKobo < 0
                          ? 'negative'
                          : 'zero';

                  return (
                    <tr
                      key={customerId ?? `${customerName}-${index}`}
                      data-od-id={
                        verifiedCustomer
                          ? 'customer-selection'
                          : `customer-card-${customerId ?? index}`
                      }
                    >
                      <td>{customerName}</td>
                      <td>{customer.maskedPhone ?? 'Phone unavailable'}</td>
                      <td>
                        <span
                          className={`find-customer-card-status find-customer-card-status--${cardStatusTone}`}
                        >
                          {cardStatus}
                        </span>
                      </td>
                      <td className="find-customer-table__balance">
                        <span
                          className={`find-customer-balance find-customer-balance--${balanceTone}`}
                        >
                          {typeof balanceKobo === 'number' &&
                          Number.isFinite(balanceKobo) ? (
                            <Money amountKobo={balanceKobo} />
                          ) : (
                            'Balance unavailable'
                          )}
                        </span>
                      </td>
                      <td>
                        {profileQuery ? (
                          <Link
                            className="cashier-primary-action find-customer-profile-action"
                            href={`/cashier/customers?${profileQuery.toString()}`}
                            aria-label={`View profile for ${customerName}`}
                          >
                            View profile
                          </Link>
                        ) : (
                          'Profile unavailable'
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="find-customer-empty-cell" colSpan={5}>
                    {tableBusy
                      ? hasSearchTerm
                        ? `Searching for “${lookupValue.trim()}”…`
                        : 'Loading recent customers…'
                      : hasSearchTerm
                        ? lookupMessage || 'No customers found.'
                        : recentError || 'No customers found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {showPagination ? (
          <footer className="transaction-table-footer">
            <p className="transaction-table-count" aria-live="polite">
              Showing {visibleCustomers.length} customers on this page
            </p>
            <nav
              className="transaction-pagination"
              aria-label="Customer results pagination"
            >
              <button
                className="transaction-pagination-button"
                type="button"
                onClick={loadPreviousPage}
                disabled={!canGoPrevious || paginationBusy}
                aria-label="Previous customer page"
              >
                <ChevronLeft aria-hidden="true" size={16} />
              </button>
              <p className="transaction-pagination-status" aria-live="polite">
                Page {currentPage}
              </p>
              <button
                className="transaction-pagination-button"
                type="button"
                onClick={loadNextPage}
                disabled={!canGoNext || paginationBusy}
                aria-label="Next customer page"
              >
                <ChevronRight aria-hidden="true" size={16} />
              </button>
            </nav>
          </footer>
        ) : null}
        {pageError && retryPage ? (
          <div className="find-customer-page-error" role="alert">
            <p>{pageError}</p>
            <Button
              type="button"
              variant="ghost"
              size="compact"
              onClick={retryFailedPage}
              disabled={paginationBusy}
            >
              Retry page
            </Button>
          </div>
        ) : null}
        {!verifiedCustomer && hasSearchTerm && visibleCustomers.length > 0 ? (
          <p className="find-customer-discovery-note sc-discovery-muted">
            Scan an active card to continue
          </p>
        ) : null}
      </section>
    </div>
  );
}
