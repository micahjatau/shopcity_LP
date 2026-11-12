'use client';

import Link from 'next/link';
import { useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { PilotHealthPanel } from './pilot-health-panel';
import { ReportsWorkspace } from './reports-workspace';
import styles from './admin-operations-tabs.module.css';
import pageFrameStyles from './admin-workspace-page.module.css';

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
    description: 'Manage staff accounts and roles.',
    action: 'Manage users',
  },
  {
    href: '/admin/devices',
    label: 'Devices',
    description: 'Register and manage POS devices.',
    action: 'Manage devices',
  },
  {
    href: '/admin/branches',
    label: 'Branches',
    description: 'Manage branch details and assigned devices.',
    action: 'Manage branches',
  },
  {
    href: '/admin/audit',
    label: 'Audit',
    description: 'Search activity by user.',
    action: 'Review audit history',
  },
  {
    href: '/admin/adjustments',
    label: 'Adjustments',
    description: 'Create credit or debit adjustments.',
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
    <section
      className={pageFrameStyles.page}
      data-testid="admin-workspace-page"
    >
      <header className={pageFrameStyles.header}>
        <h1 className={pageFrameStyles.title}>Operations</h1>
        <p className={pageFrameStyles.description}>
          Check system health, view reports, and manage key settings.
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
                      Manage settings
                    </h2>
                    <p className={styles.controlsDescription}>
                      Choose a page to manage staff, devices, branches, audit
                      history, or wallet adjustments.
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
