'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { DayPicker, type DateRange } from 'react-day-picker';
import { CalendarDays, Filter, Search, X } from 'lucide-react';
import {
  cardsControllerListIssuedManagementCardsV1,
  type CardsControllerListIssuedManagementCardsV1Params,
  type CardsControllerListIssuedManagementCardsV1200DataItemsItem,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Button, Input, Popover, Select } from '../ui';
import { StatusBadge, type StatusTone } from '../shopcity';

const PAGE_LIMIT = '25';
type IssuedCard = CardsControllerListIssuedManagementCardsV1200DataItemsItem;
type StatusFilter = 'ALL' | 'ACTIVE' | 'BLOCKED' | 'REPLACED';

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

export function SupervisorIssuedCardDirectory({
  onAssignCard,
}: Readonly<{ onAssignCard: () => void }>) {
  const [items, setItems] = useState<IssuedCard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [settledSearchQuery, setSettledSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [dateRange, setDateRange] = useState<DateRange>();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const issuedFrom = dateRange?.from
    ? format(dateRange.from, 'yyyy-MM-dd')
    : '';
  const issuedTo = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '';
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingMoreFailed, setLoadingMoreFailed] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const requestVersion = useRef(0);

  useEffect(() => {
    const timer = setTimeout(
      () => setSettledSearchQuery(searchQuery.trim()),
      250,
    );
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!datePickerOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !datePickerRef.current?.contains(event.target)
      ) {
        setDatePickerOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDatePickerOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [datePickerOpen]);

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
  const dateRangeLabel = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, 'MMM dd, yyyy')} – ${format(dateRange.to, 'MMM dd, yyyy')}`
      : `${format(dateRange.from, 'MMM dd, yyyy')} – Select end date`
    : 'Pick a date range';

  useEffect(() => {
    let active = true;
    requestVersion.current += 1;
    setLoadingMore(false);
    setFailed(false);
    setItems([]);
    setNextCursor(null);
    setHasMore(false);
    setLoadingMoreFailed(false);
    if (invalidDateRange) {
      setLoading(false);
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
          return;
        }
        setItems(response.data.data.items);
        setNextCursor(response.data.data.nextCursor);
        setHasMore(response.data.data.hasMore);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setFailed(true);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters, invalidDateRange, retryAttempt]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore || !hasMore) return;
    const requestId = requestVersion.current;
    setLoadingMore(true);
    setLoadingMoreFailed(false);
    try {
      const response = await cardsControllerListIssuedManagementCardsV1(
        listParams(nextCursor, filters),
        createApiRequest({ csrf: true }),
      );
      if (requestId !== requestVersion.current) return;
      if (response.status !== 200) {
        setLoadingMoreFailed(true);
        return;
      }
      setItems((current) => {
        const existingNumbers = new Set(current.map((item) => item.cardNumber));
        return [
          ...current,
          ...response.data.data.items.filter(
            (item) => !existingNumbers.has(item.cardNumber),
          ),
        ];
      });
      setNextCursor(response.data.data.nextCursor);
      setHasMore(response.data.data.hasMore);
    } catch {
      setLoadingMoreFailed(true);
    } finally {
      if (requestId === requestVersion.current) setLoadingMore(false);
    }
  }, [filters, hasMore, loadingMore, nextCursor]);

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
            className="supervisor-issued-card-directory__search-toggle"
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
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <div className="supervisor-customer-directory__filter">
            <Filter aria-hidden="true" size={15} />
            <Select
              aria-label="Filter by status"
              className="supervisor-customer-directory__filter-select"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              options={[
                { value: 'ALL', label: 'All statuses' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'BLOCKED', label: 'Blocked' },
                { value: 'REPLACED', label: 'Replaced' },
              ]}
            />
          </div>
        </div>
        <div className="supervisor-issued-card-directory__toolbar-right">
          <div
            className="supervisor-issued-card-directory__date-filter"
            ref={datePickerRef}
          >
            <span className="supervisor-issued-card-directory__date-label">
              Date issued
            </span>
            <Button
              type="button"
              variant="secondary"
              className="supervisor-issued-card-directory__date-trigger"
              aria-haspopup="dialog"
              aria-expanded={datePickerOpen}
              onClick={() => setDatePickerOpen((open) => !open)}
            >
              <CalendarDays aria-hidden="true" size={16} />
              <span>{dateRangeLabel}</span>
            </Button>
            <Popover
              open={datePickerOpen}
              label="Choose issue date range"
              className="supervisor-issued-card-directory__calendar-popover"
            >
              <DayPicker
                mode="range"
                min={1}
                selected={dateRange}
                onSelect={(range) => {
                  setDateRange(range);
                  if (range?.to) setDatePickerOpen(false);
                }}
                defaultMonth={dateRange?.from ?? new Date()}
                numberOfMonths={2}
                className="supervisor-issued-card-directory__calendar"
              />
              <div className="supervisor-issued-card-directory__calendar-footer">
                <span aria-live="polite">{dateRangeLabel}</span>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!dateRange?.from}
                  onClick={() => setDateRange(undefined)}
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setDatePickerOpen(false)}
                >
                  Done
                </Button>
              </div>
            </Popover>
          </div>
          <Button variant="primary" onClick={onAssignCard}>
            Assign card
          </Button>
        </div>
      </div>
      <div className="supervisor-customer-table-wrap">
        <table aria-label="Issued cards" className="supervisor-customer-table">
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
                    className="supervisor-customer-table__card-number break-all font-mono"
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
      {loadingMoreFailed ? (
        <div role="alert" className="mt-4 flex flex-wrap items-center gap-3">
          <p>
            More issued cards could not be loaded. Your current rows remain.
          </p>
          <Button
            type="button"
            variant="secondary"
            disabled={loadingMore}
            onClick={() => void loadMore()}
          >
            Retry loading more
          </Button>
        </div>
      ) : null}
      {hasMore && !loading ? (
        <div className="mt-4">
          <Button
            type="button"
            variant="secondary"
            loading={loadingMore}
            disabled={loadingMore}
            onClick={() => void loadMore()}
          >
            Load more cards
          </Button>
        </div>
      ) : null}
    </section>
  );
}
