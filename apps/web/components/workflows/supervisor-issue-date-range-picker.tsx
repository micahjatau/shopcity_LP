'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import { format, isValid } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { Button } from '../ui';

type DateRangeValue = { startDate: string; endDate: string };
type SomCalendarProps = ComponentProps<
  typeof import('@migov/digital-guidelines-core-react').SomCalendar
>;
type Props = Readonly<{
  className: string;
  startDate: string;
  endDate: string;
  onChange: (value: DateRangeValue) => void;
}>;

const SomCalendar = dynamic<SomCalendarProps>(
  async () => {
    const { setAssetPath } =
      await import('@migov/digital-guidelines-core/components/index.js');
    setAssetPath(`${window.location.origin}/`);
    const { SomCalendar } =
      await import('@migov/digital-guidelines-core-react');
    return SomCalendar;
  },
  {
    ssr: false,
    loading: () => (
      <div
        className="supervisor-issued-card-directory__calendar-loading"
        role="status"
      >
        Loading calendar…
      </div>
    ),
  },
);

function dateValue(value: unknown): string {
  return value instanceof Date && isValid(value)
    ? format(value, 'M/d/yyyy')
    : '';
}

export function SupervisorIssueDateRangePicker({
  className,
  startDate,
  endDate,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const controlRef = useRef<HTMLDivElement>(null);
  const rangeLabel = startDate
    ? endDate
      ? `${startDate} to ${endDate}`
      : `${startDate}, choose an end date`
    : '';

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !controlRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleDateChange = (event: CustomEvent) => {
    const detail = event.detail as {
      date1?: Date;
      date2?: Date;
    };
    const nextRange = {
      startDate: dateValue(detail?.date1),
      endDate: dateValue(detail?.date2),
    };
    onChange(nextRange);
    if (nextRange.endDate) setOpen(false);
  };

  return (
    <div
      ref={controlRef}
      className="supervisor-issued-card-directory__date-control"
    >
      <Button
        type="button"
        variant="secondary"
        className={`${className} supervisor-customer-directory__filter`}
        aria-label={rangeLabel ? `Date issued, ${rangeLabel}` : 'Date issued'}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="issued-card-date-range-popup"
        onClick={() => setOpen((current) => !current)}
      >
        <CalendarDays aria-hidden="true" size={16} />
        <span>Date issued</span>
      </Button>
      {open ? (
        <div
          id="issued-card-date-range-popup"
          className="supervisor-issued-card-directory__calendar-popup"
          role="dialog"
          aria-label="Choose issue date range"
        >
          <div
            className="supervisor-issued-card-directory__calendar-selection"
            role="status"
            aria-live="polite"
          >
            <span>Selected dates</span>
            <strong>
              {startDate
                ? `${startDate}${endDate ? ` – ${endDate}` : ' – Select end date'}`
                : 'Select a start date'}
            </strong>
          </div>
          <SomCalendar
            monthsNb={1}
            enableRangePicker
            date1={startDate}
            date2={endDate}
            onDateChange={handleDateChange}
          />
          <div className="supervisor-issued-card-directory__calendar-footer">
            <span aria-live="polite">
              {startDate && !endDate
                ? 'Choose an end date'
                : 'Select a start date, then an end date'}
            </span>
            <div>
              <Button
                type="button"
                variant="ghost"
                size="compact"
                disabled={!startDate && !endDate}
                onClick={() => onChange({ startDate: '', endDate: '' })}
              >
                Clear
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="compact"
                onClick={() => setOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
