'use client';

import {
  cardsControllerLookupCardV1,
  customersControllerListCustomersV1,
  usersControllerListCashiersV1,
} from '../lib/api/generated-client';
import { createApiRequest } from '../lib/api/request';
import { useEffect, useRef, useState } from 'react';
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
  const categories: SearchCategory[] =
    userRole === 'SUPERVISOR' || userRole === 'ADMIN'
      ? ['customers', 'cards', 'cashiers']
      : ['customers', 'cards'];
  const [category, setCategory] = useState<SearchCategory>('customers');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestGeneration = useRef(0);

  useEffect(() => {
    if (!categories.includes(category)) {
      setCategory('customers');
    }
  }, [category, categories]);

  useEffect(() => {
    if (!open || category === 'cards' || query.trim().length < 2) {
      if (category !== 'cards') {
        setResults([]);
        setMessage('');
      }
      return undefined;
    }

    const generation = ++requestGeneration.current;
    const timer = window.setTimeout(() => {
      void searchDirectory(category, query.trim(), generation);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [category, open, query, userRole]);

  async function searchDirectory(
    nextCategory: SearchCategory,
    term: string,
    generation: number,
  ) {
    setPending(true);
    setMessage('Searching…');
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
        setMessage(`Search unavailable (${response.status}).`);
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
      setMessage(nextResults.length ? '' : 'No matching records.');
    } catch {
      if (generation === requestGeneration.current) {
        setResults([]);
        setMessage('Search could not be completed.');
      }
    } finally {
      if (generation === requestGeneration.current) setPending(false);
    }
  }

  async function searchCard() {
    const term = query.trim();
    if (!term) {
      setMessage('Enter a card serial or barcode first.');
      return;
    }
    const generation = ++requestGeneration.current;
    setPending(true);
    setOpen(true);
    setMessage('Verifying card…');
    setResults([]);
    try {
      const response = await cardsControllerLookupCardV1(
        term,
        createApiRequest({ csrf: true }),
      );
      if (generation !== requestGeneration.current) return;
      if (response.status !== 200) {
        setMessage(`Card verification unavailable (${response.status}).`);
        return;
      }
      const record = response.data.data as Record<string, unknown>;
      const serial = String(
        record.serialNumber ?? record.cardSerialNumber ?? term,
      );
      const customer = record.customer as Record<string, unknown> | undefined;
      const name = String(
        customer?.fullName ?? record.customerName ?? 'Verified card',
      );
      setResults([
        {
          id: serial,
          label: name,
          detail: `Card ${serial}`,
          href: `${userRole === 'CASHIER' ? '/cashier/lookup' : '/supervisor/cards'}?card=${encodeURIComponent(serial)}`,
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

  function closeResults() {
    setOpen(false);
    setActiveIndex(-1);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeResults();
      return;
    }
    if (event.key === 'Enter' && category === 'cards') {
      event.preventDefault();
      void searchCard();
      return;
    }
    if (!results.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      window.location.assign(results[activeIndex].href);
    }
  }

  return (
    <div className="global-shell-search">
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
          aria-expanded={open}
          aria-controls="global-shell-search-results"
          aria-activedescendant={
            activeIndex >= 0 ? `global-search-result-${activeIndex}` : undefined
          }
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        {category === 'cards' ? (
          <button
            type="button"
            className="global-shell-search__submit"
            onClick={() => void searchCard()}
            disabled={pending}
          >
            Search
          </button>
        ) : null}
      </div>
      <div
        className="global-shell-search__categories"
        aria-label="Search category"
      >
        {categories.map((item) => (
          <button
            type="button"
            key={item}
            className={item === category ? 'is-active' : ''}
            aria-pressed={item === category}
            onClick={() => {
              setCategory(item);
              setResults([]);
              setMessage('');
              setOpen(true);
              inputRef.current?.focus();
            }}
          >
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>
      {open ? (
        <div
          id="global-shell-search-results"
          className="global-shell-search__results"
          role="listbox"
          aria-label={`${category} search results`}
        >
          {pending ? <p role="status">Searching…</p> : null}
          {!pending && message ? <p role="status">{message}</p> : null}
          {!pending
            ? results.map((result, index) => (
                <a
                  id={`global-search-result-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  href={result.href}
                  key={result.id}
                  onClick={() => setOpen(false)}
                >
                  <strong>{result.label}</strong>
                  {result.detail ? <small>{result.detail}</small> : null}
                </a>
              ))
            : null}
        </div>
      ) : null}
      <style>{`
        .global-shell-search { position: relative; width: min(430px, 42vw); z-index: 4; }
        .global-shell-search__control { display: flex; align-items: center; gap: 6px; height: 36px; border: 1px solid var(--sc-color-semantic-border); border-radius: 999px; background: var(--sc-color-neutral-50); padding: 0 8px 0 14px; }
        .global-shell-search__control input { min-width: 0; width: 100%; border: 0; outline: 0; background: transparent; color: var(--sc-color-neutral-900); font-size: 12px; }
        .global-shell-search__submit { border: 0; border-radius: 999px; background: var(--sc-color-brand-700); color: var(--sc-color-neutral-0); padding: 5px 9px; font-size: 11px; }
        .global-shell-search__categories { display: flex; gap: 4px; margin-top: 5px; }
        .global-shell-search__categories button { border: 0; border-radius: 999px; background: transparent; color: var(--sc-color-semantic-textSecondary); padding: 2px 7px; font-size: 10px; }
        .global-shell-search__categories button.is-active { background: var(--sc-color-brand-50); color: var(--sc-color-brand-700); font-weight: 700; }
        .global-shell-search__results { position: absolute; top: 68px; left: 0; right: 0; display: grid; gap: 2px; max-height: 320px; overflow: auto; border: 1px solid var(--sc-color-semantic-border); border-radius: 14px; background: var(--sc-color-neutral-0); padding: 7px; box-shadow: var(--sc-shadow-level2); }
        .global-shell-search__results p { margin: 7px; color: var(--sc-color-semantic-textSecondary); font-size: 12px; }
        .global-shell-search__results a { display: grid; gap: 2px; border-radius: 9px; color: var(--sc-color-neutral-900); padding: 9px 10px; text-decoration: none; }
        .global-shell-search__results a:hover, .global-shell-search__results a[aria-selected='true'] { background: var(--sc-color-brand-50); }
        .global-shell-search__results small { color: var(--sc-color-semantic-textSecondary); }
        @media (max-width: 767px) { .global-shell-search { width: min(100%, 230px); } .global-shell-search__categories { display: none; } .global-shell-search__results { top: 42px; } }
        @media (prefers-reduced-motion: reduce) { .global-shell-search__results a { transition: none; } }
      `}</style>
    </div>
  );
}

function normalizeResult(
  category: SearchCategory,
  item: unknown,
  role: SearchRole,
  index: number,
): SearchResult | null {
  if (!item || typeof item !== 'object') return null;
  const record = item as Record<string, unknown>;
  const id = String(record.id ?? record.customerId ?? record.userId ?? index);
  if (category === 'cashiers') {
    const username = String(record.username ?? 'Cashier');
    return {
      id,
      label: username,
      detail: record.branchId ? `Branch ${String(record.branchId)}` : undefined,
      href: `${role === 'ADMIN' ? '/admin/users' : '/supervisor/reports'}?cashierId=${encodeURIComponent(id)}`,
    };
  }
  const label = String(
    record.fullName ?? record.name ?? record.email ?? 'Customer',
  );
  const detail = String(
    record.maskedPhone ?? record.phone ?? record.email ?? '',
  );
  return {
    id,
    label,
    detail: detail || undefined,
    href: `${role === 'CASHIER' ? '/cashier/customers' : role === 'ADMIN' ? '/admin/customers' : '/supervisor/customers'}?id=${encodeURIComponent(id)}`,
  };
}
