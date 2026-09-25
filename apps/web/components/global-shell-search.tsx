'use client';

import {
  cardsControllerLookupCardV1,
  customersControllerListCustomersV1,
  usersControllerListCashiersV1,
} from '../lib/api/generated-client';
import { createApiRequest } from '../lib/api/request';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

type SearchRole = 'CASHIER' | 'SUPERVISOR' | 'ADMIN' | null;
type SearchCategory = 'customers' | 'cards' | 'cashiers';
type SearchResult = {
  id: string;
  label: string;
  detail?: string;
  href: string;
};

export function GlobalShellSearch({
  userRole,
}: Readonly<{ userRole: SearchRole }>) {
  const categories = useMemo<SearchCategory[]>(
    () =>
      userRole === 'SUPERVISOR' || userRole === 'ADMIN'
        ? ['customers', 'cards', 'cashiers']
        : ['customers', 'cards'],
    [userRole],
  );
  const [category, setCategory] = useState<SearchCategory>('customers');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const requestGeneration = useRef(0);

  const invalidateRequest = useCallback(() => {
    requestGeneration.current += 1;
    setPending(false);
  }, []);

  useEffect(() => {
    if (!categories.includes(category)) {
      invalidateRequest();
      setCategory('customers');
    }
  }, [category, categories, invalidateRequest]);

  const searchDirectory = useCallback(
    async function searchDirectory(
      nextCategory: SearchCategory,
      term: string,
      generation: number,
    ) {
      if (generation !== requestGeneration.current) return;
      setPending(true);
      setMessage(`Searching for “${term}”…`);
      setResults([]);
      try {
        const response =
          nextCategory === 'customers'
            ? await customersControllerListCustomersV1(
                { q: term, limit: '8', cursor: '' },
                createApiRequest({ csrf: true }),
              )
            : await usersControllerListCashiersV1(
                { q: term },
                createApiRequest({ csrf: true }),
              );
        if (generation !== requestGeneration.current) return;
        if (response.status !== 200) {
          setResults([]);
          setMessage(
            getAuthoritativeErrorMessage(
              response.data,
              `Search unavailable (${response.status}).`,
            ),
          );
          return;
        }
        const data = response.data.data;
        const items = Array.isArray(data) ? data : data.items;
        const nextResults = (items ?? [])
          .map((item, index) =>
            normalizeResult(nextCategory, item, userRole, index),
          )
          .filter((item): item is SearchResult => item !== null);
        setResults(nextResults);
        setActiveIndex(-1);
        setMessage(
          nextResults.length ? '' : `No matching records for “${term}”.`,
        );
      } catch {
        if (generation === requestGeneration.current) {
          setResults([]);
          setMessage('Search could not be completed.');
        }
      } finally {
        if (generation === requestGeneration.current) setPending(false);
      }
    },
    [userRole],
  );

  function submitDirectorySearch() {
    const term = query.trim();
    invalidateRequest();
    setActiveIndex(-1);
    if (!term || term.length < 2) {
      setResults([]);
      setMessage(
        term
          ? 'Enter at least 2 characters to search.'
          : 'Enter a search term first.',
      );
      setOpen(true);
      return;
    }
    const generation = requestGeneration.current;
    setOpen(true);
    void searchDirectory(category, term, generation);
  }

  async function searchCard() {
    const term = query.trim();
    invalidateRequest();
    setActiveIndex(-1);
    setResults([]);
    if (!term) {
      setMessage('Enter a card serial or barcode first.');
      setOpen(true);
      return;
    }
    const generation = requestGeneration.current;
    setPending(true);
    setOpen(true);
    setMessage(`Verifying “${term}”…`);
    try {
      const response = await cardsControllerLookupCardV1(
        term,
        createApiRequest({ csrf: true }),
      );
      if (generation !== requestGeneration.current) return;
      if (response.status !== 200) {
        setMessage(
          getAuthoritativeErrorMessage(
            response.data,
            `Card verification unavailable (${response.status}).`,
          ),
        );
        return;
      }
      const record = response.data.data as Record<string, unknown>;
      const serial =
        valueToText(record.serialNumber) ||
        valueToText(record.cardSerialNumber) ||
        term;
      const customer = record.customer as Record<string, unknown> | undefined;
      const name =
        valueToText(customer?.fullName) ||
        valueToText(record.customerName) ||
        'Verified card';
      setResults([
        {
          id: serial,
          label: name,
          detail: `Card ${serial}`,
          href: `${userRole === 'CASHIER' ? '/cashier/lookup' : userRole === 'ADMIN' ? '/admin/cards' : '/supervisor/cards'}?card=${encodeURIComponent(serial)}`,
        },
      ]);
      setMessage('');
    } catch {
      if (generation === requestGeneration.current) {
        setMessage('Card verification could not be completed.');
      }
    } finally {
      if (generation === requestGeneration.current) setPending(false);
    }
  }

  const dismissResults = useCallback(() => {
    invalidateRequest();
    setOpen(false);
    setActiveIndex(-1);
    setResults([]);
    setMessage('');
  }, [invalidateRequest]);

  useEffect(() => {
    if (!open || category === 'cards' || query.trim().length < 2) return;

    const generation = ++requestGeneration.current;
    const timer = window.setTimeout(() => {
      void searchDirectory(category, query.trim(), generation);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [category, open, query, searchDirectory]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        dismissResults();
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [dismissResults]);

  function closeResultsAndRestoreFocus() {
    dismissResults();
    inputRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeResultsAndRestoreFocus();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (category === 'cards') void searchCard();
      else if (activeIndex >= 0 && results[activeIndex]) {
        window.location.assign(results[activeIndex].href);
      } else submitDirectorySearch();
      return;
    }
    if (!results.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
    }
  }

  const showResults =
    open && (pending || Boolean(message) || results.length > 0);

  return (
    <div className="global-shell-search" ref={rootRef}>
      <div className="global-shell-search__row">
        <div className="global-shell-search__control">
          <label htmlFor="global-shell-search-input" className="sr-only">
            Search ShopCity
          </label>
          <input
            id="global-shell-search-input"
            ref={inputRef}
            value={query}
            placeholder="Search customers, cards…"
            autoComplete="off"
            role="combobox"
            aria-expanded={showResults}
            aria-controls={
              results.length ? 'global-shell-search-results' : undefined
            }
            aria-activedescendant={
              activeIndex >= 0
                ? `global-search-result-${activeIndex}`
                : undefined
            }
            onFocus={() => {
              if (query.trim().length >= 2 || category === 'cards')
                setOpen(true);
            }}
            onChange={(event) => {
              invalidateRequest();
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              setResults([]);
              setMessage('');
              setActiveIndex(-1);
              setOpen(nextQuery.trim().length >= 2);
            }}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            className="global-shell-search__submit"
            onClick={() =>
              category === 'cards' ? void searchCard() : submitDirectorySearch()
            }
            disabled={pending}
          >
            Search
          </button>
        </div>
        <div
          className="global-shell-search__categories"
          role="group"
          aria-label="Search category"
        >
          {categories.map((item) => (
            <button
              type="button"
              key={item}
              className={item === category ? 'is-active' : ''}
              aria-pressed={item === category}
              onClick={() => {
                invalidateRequest();
                setCategory(item);
                setResults([]);
                setMessage('');
                setActiveIndex(-1);
                setOpen(false);
                inputRef.current?.focus();
              }}
            >
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {showResults ? (
        <div className="global-shell-search__results">
          {pending ? (
            <p role="status">
              {category === 'cards' ? 'Verifying card…' : 'Searching…'}
            </p>
          ) : null}
          {!pending && message ? <p role="status">{message}</p> : null}
          {!pending && results.length > 0 ? (
            <div
              id="global-shell-search-results"
              className="global-shell-search__options"
              role="listbox"
              aria-label={`${category} search results`}
            >
              {results.map((result, index) => (
                <a
                  id={`global-search-result-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  href={result.href}
                  key={result.id}
                  onClick={dismissResults}
                >
                  <strong>{result.label}</strong>
                  {result.detail ? <small>{result.detail}</small> : null}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function valueToText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

function getAuthoritativeErrorMessage(
  payload: unknown,
  fallback: string,
): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const record = payload as Record<string, unknown>;
  const nested = record.error;
  const message =
    record.message ??
    (nested && typeof nested === 'object'
      ? (nested as Record<string, unknown>).message
      : undefined);
  return typeof message === 'string' && message.trim() ? message : fallback;
}

function normalizeResult(
  category: SearchCategory,
  item: unknown,
  role: SearchRole,
  index: number,
): SearchResult | null {
  if (!item || typeof item !== 'object') return null;
  const record = item as Record<string, unknown>;
  const id =
    valueToText(record.id) ||
    valueToText(record.customerId) ||
    valueToText(record.userId) ||
    String(index);
  if (category === 'cashiers') {
    const username = valueToText(record.username, 'Cashier');
    const branchId = valueToText(record.branchId);
    return {
      id,
      label: username,
      detail: branchId ? `Branch ${branchId}` : undefined,
      href: `${role === 'ADMIN' ? '/admin/users' : '/supervisor/reports'}?cashierId=${encodeURIComponent(id)}`,
    };
  }
  const label =
    valueToText(record.fullName) ||
    valueToText(record.name) ||
    valueToText(record.email) ||
    'Customer';
  const detail =
    valueToText(record.maskedPhone) ||
    valueToText(record.phone) ||
    valueToText(record.email);
  return {
    id,
    label,
    detail: detail || undefined,
    href: `${role === 'CASHIER' ? '/cashier/customers' : role === 'ADMIN' ? '/admin/customers' : '/supervisor/customers'}?id=${encodeURIComponent(id)}`,
  };
}
