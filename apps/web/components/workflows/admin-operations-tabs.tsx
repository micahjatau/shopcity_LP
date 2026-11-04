'use client';

import Link from 'next/link';
import { useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { PilotHealthPanel } from './pilot-health-panel';
import { ReportsWorkspace } from './reports-workspace';
import styles from './admin-operations-tabs.module.css';

const operationsTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'reports', label: 'Reports' },
  { id: 'controls', label: 'Controls' },
] as const;

type OperationsTab = (typeof operationsTabs)[number]['id'];

const controlRoutes = [
  {
    href: '/admin/users',
    label: 'Users',
    description: 'Create staff and manage roles, branches, and account status.',
    action: 'Manage users',
  },
  {
    href: '/admin/devices',
    label: 'Devices',
    description: 'Manage POS devices and their registration status.',
    action: 'Manage devices',
  },
  {
    href: '/admin/branches',
    label: 'Branches',
    description: 'Create and manage branch details and device assignments.',
    action: 'Manage branches',
  },
  {
    href: '/admin/audit',
    label: 'Audit',
    description: 'Look up audit history by actor.',
    action: 'Review audit history',
  },
  {
    href: '/admin/adjustments',
    label: 'Adjustments',
    description:
      'Create credit or debit adjustments with a consequence preview.',
    action: 'Manage adjustments',
  },
] as const;

export function AdminOperationsTabs() {
  const [activeTab, setActiveTab] = useState<OperationsTab>('overview');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const idPrefix = useId();

  function tabId(tab: OperationsTab) {
    return `${idPrefix}-operations-tab-${tab}`;
  }

  function panelId(tab: OperationsTab) {
    return `${idPrefix}-operations-panel-${tab}`;
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let nextIndex: number;

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (index + 1) % operationsTabs.length;
        break;
      case 'ArrowLeft':
        nextIndex = (index - 1 + operationsTabs.length) % operationsTabs.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = operationsTabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextTab = operationsTabs[nextIndex];
    setActiveTab(nextTab.id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <section className={styles.workspace}>
      <header className={styles.header}>
        <h1 className={styles.title}>Operations</h1>
        <p className={styles.description}>
          Monitor pilot health, review reports, and manage administrative
          controls.
        </p>
      </header>

      <div className={styles.tabs}>
        <div
          className={styles.tabList}
          role="tablist"
          aria-label="Operations sections"
        >
          {operationsTabs.map((tab, index) => (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              id={tabId(tab.id)}
              className={styles.tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={panelId(tab.id)}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {operationsTabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <section
              key={tab.id}
              id={panelId(tab.id)}
              className={styles.tabPanel}
              role="tabpanel"
              aria-labelledby={tabId(tab.id)}
              tabIndex={isActive ? 0 : -1}
              hidden={!isActive}
            >
              {isActive && tab.id === 'overview' ? (
                <PilotHealthPanel compact cardStyleVariant="adminOverview" />
              ) : null}
              {isActive && tab.id === 'reports' ? (
                <div className="supervisor-reports-page admin-operations-reports">
                  <ReportsWorkspace
                    loadTenantBranchOptions
                    showStatusBadges={false}
                    summaryItemsPresentation="table-dialog"
                  />
                </div>
              ) : null}
              {isActive && tab.id === 'controls' ? (
                <section
                  className={styles.controls}
                  aria-labelledby={`${idPrefix}-controls-heading`}
                >
                  <header className={styles.controlsHeader}>
                    <h2
                      id={`${idPrefix}-controls-heading`}
                      className={styles.controlsTitle}
                    >
                      Administrative controls
                    </h2>
                    <p className={styles.controlsDescription}>
                      Open a dedicated page to manage users, devices, branches,
                      audit history, or adjustments.
                    </p>
                  </header>
                  <div className={styles.controlGrid}>
                    {controlRoutes.map((route) => (
                      <Link
                        key={route.href}
                        className={styles.controlCard}
                        href={route.href}
                      >
                        <span className={styles.controlTitle}>
                          {route.label}
                        </span>
                        <span className={styles.controlDescription}>
                          {route.description}
                        </span>
                        <span className={styles.controlAction}>
                          {route.action}
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}
            </section>
          );
        })}
      </div>
    </section>
  );
}
