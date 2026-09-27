'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useRef } from 'react';
import { SupervisorCardAssignment } from './supervisor-card-assignment';
import { SupervisorCardManagement } from './supervisor-card-management';
import { CashierPageHeader } from '../shopcity';

type Tab = { value: string; label: string };
const tabs: Tab[] = [
  { value: 'assign', label: 'Assign card' },
  { value: 'manage', label: 'Manage cards' },
];

export function SupervisorCardWorkflows() {
  const router = useRouter();
  const params = useSearchParams();
  const requestedTab = params.get('tab');
  const activeTab = tabs.some(({ value }) => value === requestedTab)
    ? requestedTab!
    : tabs[0].value;

  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function selectTab(index: number, focus = false) {
    const tab = tabs[index];
    if (!tab) return;
    const next = new URLSearchParams(params.toString());
    next.set('tab', tab.value);
    router.push(`/supervisor/cards?${next.toString()}`, { scroll: false });
    if (focus) tabRefs.current[index]?.focus();
  }

  return (
    <section className="supervisor-page sc-page">
      <CashierPageHeader
        className="cashier-route-header supervisor-page__header"
        title="Manage cards"
        description="Find a customer to assign, replace, or update card status."
      />
      <div
        role="tablist"
        aria-label="Card tasks"
        className="sc-tabs mb-6 flex flex-wrap gap-2"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.value}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            id={`card-tab-${tab.value}`}
            type="button"
            role="tab"
            aria-selected={tab.value === activeTab}
            aria-controls={`card-panel-${tab.value}`}
            tabIndex={tab.value === activeTab ? 0 : -1}
            onClick={() => selectTab(index)}
            onKeyDown={(event) => {
              let nextIndex: number | undefined;
              if (event.key === 'ArrowRight')
                nextIndex = (index + 1) % tabs.length;
              if (event.key === 'ArrowLeft')
                nextIndex = (index + tabs.length - 1) % tabs.length;
              if (event.key === 'Home') nextIndex = 0;
              if (event.key === 'End') nextIndex = tabs.length - 1;
              if (nextIndex !== undefined) {
                event.preventDefault();
                selectTab(nextIndex, true);
              }
            }}
            className={`sc-button sc-button--${tab.value === activeTab ? 'primary' : 'secondary'} sc-button--standard`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => {
        const isActive = tab.value === activeTab;
        return (
          <section
            key={tab.value}
            role="tabpanel"
            id={`card-panel-${tab.value}`}
            aria-labelledby={`card-tab-${tab.value}`}
            tabIndex={isActive ? 0 : undefined}
            hidden={!isActive}
            className="min-w-0 focus-visible:outline focus-visible:outline-2"
          >
            {isActive &&
              (tab.value === 'assign' ? (
                <SupervisorCardAssignment
                  customerId={params.get('id')}
                  initialQuery={params.get('q') ?? ''}
                  onCustomerId={(id) => {
                    const next = new URLSearchParams(params.toString());
                    if (id) next.set('id', id);
                    else next.delete('id');
                    next.set('tab', 'assign');
                    router.replace(`/supervisor/cards?${next.toString()}`, {
                      scroll: false,
                    });
                  }}
                />
              ) : (
                <SupervisorCardManagement />
              ))}
          </section>
        );
      })}
    </section>
  );
}
