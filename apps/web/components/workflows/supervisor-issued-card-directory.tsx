'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import Link from 'next/link';
import { format, isValid, parse } from 'date-fns';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  X,
} from 'lucide-react';
import {
  cardsControllerListIssuedManagementCardsV1,
  type CardsControllerListIssuedManagementCardsV1Params,
  type CardsControllerListIssuedManagementCardsV1200DataItemsItem,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Button, Input } from '../ui';
import { StatusBadge, type StatusTone } from '../shopcity';
import { SupervisorIssueDateRangePicker } from './supervisor-issue-date-range-picker';

const PAGE_LIMIT = '25';

type IssuedCard = CardsControllerListIssuedManagementCardsV1200DataItemsItem;
type StatusFilter = 'ALL' | 'ACTIVE' | 'BLOCKED' | 'REPLACED';
const STATUS_FILTER_OPTIONS: ReadonlyArray<{
  value: StatusFilter;
  label: string;
}> = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'BLOCKED', label: 'Blocked' },
  { value: 'REPLACED', label: 'Replaced' },
];
type DateRangeValue = { startDate: string; endDate: string };
type CardPageRequest = { cursor: string; pageIndex: number };

function toApiDate(value: string): string {
  if (!value) return '';
  const date = parse(value, 'M/d/yyyy', new Date(2000, 0, 1));
  return isValid(date) ? format(date, 'yyyy-MM-dd') : '';
}

type IssuedCardFilters = Pick<
  CardsControllerListIssuedManagementCardsV1Params,
  'q' | 'status' | 'issuedFrom' | 'issuedTo'
>;

function listParams(
  cursor: string,
  filters: IssuedCardFilters,
): CardsControllerListIssuedManagementCardsV1Params {
  return { limit: PAGE_LIMIT, cursor, ...filters };
}

function statusPresentation(status: IssuedCard['status']): {
  label: string;
  tone: StatusTone;
} {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Active', tone: 'success' };
    case 'BLOCKED':
      return { label: 'Blocked', tone: 'danger' };
    case 'REPLACED':
      return { label: 'Replaced', tone: 'warning' };
  }
}

function issuedDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date not provided'
    : date.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
}

function SupervisorIssuedCardStatusFilter({
  value,
  onChange,
}: Readonly<{
  value: StatusFilter;
  onChange: (status: StatusFilter) => void;
}>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = STATUS_FILTER_OPTIONS.findIndex(
    (option) => option.value === value,
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const selectedOption = STATUS_FILTER_OPTIONS[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, open]);

  const handleOptionKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex: number | undefined;
    if (event.key === 'ArrowDown')
      nextIndex = (index + 1) % STATUS_FILTER_OPTIONS.length;
    if (event.key === 'ArrowUp')
      nextIndex =
        (index - 1 + STATUS_FILTER_OPTIONS.length) %
        STATUS_FILTER_OPTIONS.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = STATUS_FILTER_OPTIONS.length - 1;
    if (nextIndex !== undefined) {
      event.preventDefault();
      setActiveIndex(nextIndex);
      optionRefs.current[nextIndex]?.focus();
    }
    if (event.key === 'Tab') setOpen(false);
  };

  return (
    <div ref={rootRef} className="supervisor-customer-directory__status-filter">
      <Button
        ref={triggerRef}
        type="button"
        variant="secondary"
        className="supervisor-customer-directory__filter supervisor-customer-directory__status-trigger"
        aria-label={`Filter by status, ${selectedOption.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="issued-card-status-options"
        onClick={() => {
          if (!open) setActiveIndex(selectedIndex);
          setOpen((current) => !current);
        }}
      >
        <Filter aria-hidden="true" size={15} />
        <span>{selectedOption.label}</span>
        <ChevronDown aria-hidden="true" size={14} />
      </Button>
      {open ? (
        <div
          id="issued-card-status-options"
          className="supervisor-customer-directory__status-menu"
          role="listbox"
          aria-label="Filter by status"
        >
          {STATUS_FILTER_OPTIONS.map((option, index) => (
            <button
              key={option.value}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              type="button"
              role="option"
              aria-selected={value === option.value}
              tabIndex={activeIndex === index ? 0 : -1}
              className="supervisor-customer-directory__status-option"
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
                triggerRef.current?.focus();
              }}
            >
              <span>{option.label}</span>
              {value === option.value ? (
                <Check aria-hidden="true" size={14} />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SupervisorIssuedCardDirectory({
  onAssignCard,
}: Readonly<{ onAssignCard: () => void }>) {
  const [items, setItems] = useState<IssuedCard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [settledSearchQuery, setSettledSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    startDate: '',
    endDate: '',
  });
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const issuedFrom = toApiDate(dateRange.startDate);
  const issuedTo = toApiDate(dateRange.endDate);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursorStack, setCursorStack] = useState<string[]>(['']);
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [failedPageRequest, setFailedPageRequest] =
    useState<CardPageRequest | null>(null);
  const [filtersDirty, setFiltersDirty] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const requestVersion = useRef(0);

  useEffect(() => {
    const timer = setTimeout(
      () => setSettledSearchQuery(searchQuery.trim()),
      250,
    );
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filters = useMemo<IssuedCardFilters>(
    () => ({
      ...(settledSearchQuery ? { q: settledSearchQuery } : {}),
      ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
      ...(issuedFrom ? { issuedFrom } : {}),
      ...(issuedTo ? { issuedTo } : {}),
    }),
    [issuedFrom, issuedTo, settledSearchQuery, statusFilter],
  );
  const invalidDateRange = Boolean(
    issuedFrom && issuedTo && issuedFrom > issuedTo,
  );
  const searchDirty = searchQuery.trim() !== settledSearchQuery;
  const pageControlsDisabled =
    loading || pageLoading || filtersDirty || searchDirty || invalidDateRange;

  useEffect(() => {
    let active = true;
    requestVersion.current += 1;
    setPageLoading(false);
    setFailedPageRequest(null);
    setFailed(false);
    setItems([]);
    setNextCursor(null);
    setHasMore(false);
    setCursorStack(['']);
    setPageIndex(0);
    if (invalidDateRange) {
      setLoading(false);
      setFiltersDirty(false);
      return () => {
        active = false;
      };
    }
    setLoading(true);
    void cardsControllerListIssuedManagementCardsV1(
      listParams('', filters),
      createApiRequest({ csrf: true }),
    )
      .then((response) => {
        if (!active) return;
        if (response.status !== 200) {
          setFailed(true);
          setLoading(false);
          setFiltersDirty(false);
          return;
        }
        setItems(response.data.data.items);
        setNextCursor(response.data.data.nextCursor);
        setHasMore(response.data.data.hasMore);
        setLoading(false);
        setFiltersDirty(false);
      })
      .catch(() => {
        if (!active) return;
        setFailed(true);
        setLoading(false);
        setFiltersDirty(false);
      });
    return () => {
      active = false;
    };
  }, [filters, invalidDateRange, retryAttempt]);

  async function loadPage(cursor: string, targetPageIndex: number) {
    if (pageControlsDisabled || failed) return;
    const requestId = requestVersion.current;
    setPageLoading(true);
    setFailedPageRequest(null);
    try {
      const response = await cardsControllerListIssuedManagementCardsV1(
        listParams(cursor, filters),
        createApiRequest({ csrf: true }),
      );
      if (requestId !== requestVersion.current) return;
      if (response.status !== 200) throw new Error('card page unavailable');

      const result = response.data.data;
      setItems(result.items);
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);
      setCursorStack((current) => [
        ...current.slice(0, targetPageIndex),
        cursor,
      ]);
      setPageIndex(targetPageIndex);
    } catch {
      if (requestId !== requestVersion.current) return;
      setFailedPageRequest({ cursor, pageIndex: targetPageIndex });
    } finally {
      if (requestId === requestVersion.current) setPageLoading(false);
    }
  }

  function loadNextPage() {
    if (!nextCursor || !hasMore || pageControlsDisabled || failed) return;
    void loadPage(nextCursor, pageIndex + 1);
  }

  function loadPreviousPage() {
    if (pageIndex <= 0 || pageControlsDisabled || failed) return;
    const previousPageIndex = pageIndex - 1;
    void loadPage(cursorStack[previousPageIndex] ?? '', previousPageIndex);
  }

  function retryFailedPage() {
    if (!failedPageRequest) return;
    void loadPage(failedPageRequest.cursor, failedPageRequest.pageIndex);
  }

  return (
    <section
      className="sc-card sc-card--standard supervisor-issued-card-directory min-w-0 p-4 sm:p-6"
      aria-label="Issued cards directory"
    >
      <div className="supervisor-customer-directory__toolbar supervisor-issued-card-directory__toolbar">
        <div className="supervisor-issued-card-directory__toolbar-left">
          <Button
            type="button"
            variant="secondary"
            className="supervisor-customer-directory__search-submit supervisor-issued-card-directory__search-toggle"
            aria-label={mobileSearchOpen ? 'Hide card search' : 'Search cards'}
            aria-expanded={mobileSearchOpen}
            aria-controls="issued-card-search"
            onClick={() => {
              const nextOpen = !mobileSearchOpen;
              setMobileSearchOpen(nextOpen);
              if (nextOpen)
                requestAnimationFrame(() => searchInputRef.current?.focus());
            }}
          >
            {mobileSearchOpen ? (
              <X aria-hidden="true" size={16} />
            ) : (
              <Search aria-hidden="true" size={16} />
            )}
          </Button>
          <label className="sr-only" htmlFor="issued-card-search">
            Search by card number or owner name
          </label>
          <div
            className={`supervisor-customer-directory__search supervisor-customer-directory__search-control supervisor-issued-card-directory__search${mobileSearchOpen ? ' is-open' : ''}`}
          >
            <Search aria-hidden="true" size={16} />
            <Input
              ref={searchInputRef}
              id="issued-card-search"
              type="search"
              className="supervisor-customer-directory__search-input"
              placeholder="Search cards or owners"
              value={searchQuery}
              onChange={(event) => {
                const nextQuery = event.target.value;
                setFiltersDirty(nextQuery.trim() !== settledSearchQuery);
                setSearchQuery(nextQuery);
              }}
            />
          </div>
          <SupervisorIssuedCardStatusFilter
            value={statusFilter}
            onChange={(nextStatus) => {
              if (nextStatus !== statusFilter) setFiltersDirty(true);
              setStatusFilter(nextStatus);
            }}
          />
        </div>
        <div className="supervisor-issued-card-directory__toolbar-right">
          <div className="supervisor-issued-card-directory__date-filter">
            <SupervisorIssueDateRangePicker
              className="supervisor-issued-card-directory__date-trigger"
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onChange={(nextDateRange) => {
                if (
                  nextDateRange.startDate !== dateRange.startDate ||
                  nextDateRange.endDate !== dateRange.endDate
                ) {
                  setFiltersDirty(true);
                }
                setDateRange(nextDateRange);
              }}
            />
          </div>
          <Button
            variant="primary"
            className="supervisor-customer-directory__register supervisor-issued-card-directory__assign-button"
            onClick={onAssignCard}
          >
            Assign card
          </Button>
        </div>
      </div>
      <div className="supervisor-customer-table-wrap">
        <table
          aria-label="Issued cards"
          className="supervisor-customer-table supervisor-issued-card-directory__table"
        >
          <thead>
            <tr>
              <th scope="col">Card number</th>
              <th scope="col">Owner</th>
              <th scope="col">Status</th>
              <th scope="col">Date issued</th>
              <th scope="col">View card</th>
            </tr>
          </thead>
          <tbody>
            {invalidDateRange ? (
              <tr>
                <td className="supervisor-customer-table__empty" colSpan={5}>
                  <div role="alert">
                    The issue-date start must be on or before the end date.
                  </div>
                </td>
              </tr>
            ) : loading ? (
              <tr>
                <td className="supervisor-customer-table__empty" colSpan={5}>
                  <div role="status" aria-live="polite">
                    Loading issued cards…
                  </div>
                </td>
              </tr>
            ) : failed ? (
              <tr>
                <td className="supervisor-customer-table__empty" colSpan={5}>
                  <div role="alert" className="space-y-2">
                    <p>Issued cards could not be loaded.</p>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setRetryAttempt((attempt) => attempt + 1)}
                    >
                      Retry
                    </Button>
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="supervisor-customer-table__empty" colSpan={5}>
                  No previously issued cards match these filters.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.cardNumber}>
                  <td
                    data-label="Card number"
                    className="supervisor-customer-table__card-number"
                  >
                    {item.cardNumber}
                  </td>
                  <td data-label="Owner">
                    <div className="supervisor-customer-table__identity">
                      <strong>{item.customer.fullName}</strong>
                    </div>
                  </td>
                  <td data-label="Status">
                    <StatusBadge {...statusPresentation(item.status)} />
                  </td>
                  <td data-label="Date issued">{issuedDate(item.issuedAt)}</td>
                  <td data-label="View card">
                    <Link
                      className="supervisor-customer-table__profile-link"
                      href={`/supervisor/customers/${encodeURIComponent(item.customer.id)}?tab=virtual-card`}
                    >
                      View card
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {failedPageRequest ? (
        <div role="alert" className="mt-4 flex flex-wrap items-center gap-3">
          <p>
            The requested issued-card page could not be loaded. Your current
            page remains.
          </p>
          <Button
            type="button"
            variant="secondary"
            disabled={pageLoading}
            onClick={retryFailedPage}
          >
            Retry page
          </Button>
        </div>
      ) : null}
      <nav
        className="supervisor-transaction-pagination"
        aria-label="Issued card pages"
        aria-busy={pageLoading}
      >
        <button
          className="supervisor-transaction-pagination-button"
          type="button"
          aria-label="Previous page"
          title="Previous page"
          disabled={
            pageControlsDisabled ||
            failed ||
            failedPageRequest !== null ||
            pageIndex === 0
          }
          onClick={loadPreviousPage}
        >
          <ChevronLeft aria-hidden="true" size={16} />
        </button>
        <p
          className="supervisor-transaction-pagination-status"
          aria-live="polite"
        >
          Page {pageIndex + 1}
        </p>
        <button
          className="supervisor-transaction-pagination-button"
          type="button"
          aria-label="Next page"
          title="Next page"
          disabled={
            pageControlsDisabled ||
            failed ||
            failedPageRequest !== null ||
            !hasMore ||
            !nextCursor
          }
          onClick={loadNextPage}
        >
          <ChevronRight aria-hidden="true" size={16} />
        </button>
      </nav>
    </section>
  );
}
