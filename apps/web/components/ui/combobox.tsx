'use client';

import type { KeyboardEvent, ReactNode } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

export type ComboboxOption = {
  value: string;
  label: string;
  description?: ReactNode;
  disabled?: boolean;
};

export type ComboboxProps = {
  options: ComboboxOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
};

export function Combobox({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  ariaLabel,
  className = '',
}: ComboboxProps) {
  const id = useId();
  const listboxId = `${id}-listbox`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [query, setQuery] = useState(() => {
    const initial = options.find(
      (option) => option.value === (value ?? defaultValue),
    );
    return initial?.label ?? '';
  });

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return options;
    }

    return options.filter((option) =>
      option.label.toLowerCase().includes(normalized),
    );
  }, [options, query]);

  const activeOption =
    highlightedIndex >= 0 ? filteredOptions[highlightedIndex] : null;
  const activeOptionId = activeOption
    ? `${id}-${activeOption.value}`
    : undefined;

  useEffect(() => {
    const selected = options.find((option) => option.value === value);
    if (selected) {
      setQuery(selected.label);
    }
  }, [options, value]);

  useEffect(() => {
    if (!open) {
      setHighlightedIndex(-1);
      return;
    }

    const selectedIndex = filteredOptions.findIndex(
      (option) => option.value === value,
    );
    if (selectedIndex >= 0) {
      setHighlightedIndex(selectedIndex);
    } else if (filteredOptions.length > 0) {
      setHighlightedIndex(0);
    }
  }, [filteredOptions, open, value]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!inputRef.current) {
        return;
      }
      const target = event.target as Node;
      if (!inputRef.current.parentElement?.contains(target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  function choose(option: ComboboxOption) {
    if (option.disabled) {
      return;
    }
    setQuery(option.label);
    setOpen(false);
    setHighlightedIndex(-1);
    onValueChange?.(option.value);
    inputRef.current?.focus();
  }

  function moveHighlight(delta: number) {
    if (!filteredOptions.length) {
      return;
    }

    setOpen(true);
    setHighlightedIndex((current) => {
      let next = current + delta;
      if (next < 0) {
        next = filteredOptions.length - 1;
      }
      if (next >= filteredOptions.length) {
        next = 0;
      }

      const maxAttempts = filteredOptions.length;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const option = filteredOptions[next];
        if (!option.disabled) {
          return next;
        }
        next =
          delta > 0
            ? (next + 1) % filteredOptions.length
            : (next - 1 + filteredOptions.length) % filteredOptions.length;
      }

      return current;
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveHighlight(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveHighlight(-1);
      return;
    }

    if (event.key === 'Enter' && open && filteredOptions[highlightedIndex]) {
      event.preventDefault();
      choose(filteredOptions[highlightedIndex]);
      return;
    }

    if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className={['sc-combobox', className].filter(Boolean).join(' ')}>
      <input
        ref={inputRef}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeOptionId}
        className="sc-control sc-input sc-combobox__input"
        placeholder={placeholder}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setHighlightedIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {open ? (
        <ul id={listboxId} role="listbox" className="sc-combobox__listbox">
          {filteredOptions.length ? (
            filteredOptions.map((option, index) => {
              const optionId = `${id}-${option.value}`;
              return (
                <li
                  key={option.value}
                  id={optionId}
                  role="option"
                  aria-selected={index === highlightedIndex}
                  aria-disabled={option.disabled || undefined}
                  data-active={index === highlightedIndex || undefined}
                  className="sc-combobox__option"
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    choose(option);
                  }}
                >
                  <strong>{option.label}</strong>
                  {option.description ? (
                    <span>{option.description}</span>
                  ) : null}
                </li>
              );
            })
          ) : (
            <li className="sc-combobox__empty">No matches</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
