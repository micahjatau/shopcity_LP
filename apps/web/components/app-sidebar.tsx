import Image from 'next/image';
import Link from 'next/link';
import type { ShellNavigationSection } from './shell-navigation';
import { Badge } from './ui';
import { ShellNavigationIcon } from './shell-navigation-icon';
import { matchShellRoute } from './shell-navigation';

export type AppSidebarProps = Readonly<{
  sections: ShellNavigationSection[];
  pathname: string | null;
  workspaceLabel: string;
  branchLabel: string;
  branchTimezone: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}>;

export function AppSidebar({
  sections,
  pathname,
  workspaceLabel,
  branchLabel,
  branchTimezone,
  isCollapsed,
  onToggleCollapse,
}: AppSidebarProps) {
  return (
    <aside
      className={`shell-sidebar${isCollapsed ? ' shell-sidebar--collapsed' : ''}`}
      data-collapsed={isCollapsed ? 'true' : 'false'}
      aria-label="Primary navigation"
    >
      <div className="shell-sidebar-brand-row">
        <div className="shell-sidebar-brand">
          <Image
            src="/brand/shopcity-mark-white.svg"
            alt="ShopCity"
            width={28}
            height={28}
          />
          <div>
            <div className="shell-sidebar-brand-title">ShopCity</div>
            <div className="shell-sidebar-brand-subtitle">{workspaceLabel}</div>
          </div>
        </div>

        <button
          type="button"
          className="shell-sidebar-toggle"
          onClick={onToggleCollapse}
          aria-pressed={isCollapsed}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span aria-hidden="true" className="shell-sidebar-toggle-icon">
            <ShellNavigationIcon
              name={isCollapsed ? 'chevron-right' : 'chevron-left'}
            />
          </span>
          <span className="shell-sidebar-toggle-label">
            {isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          </span>
        </button>
      </div>

      <nav aria-label="Primary navigation" className="shell-nav">
        {sections.map((section) => (
          <section key={section.id} className="shell-nav-section">
            <p className="shell-nav-section-label">{section.label}</p>
            <ul className="shell-nav-list">
              {section.items.map((item) => {
                const active = matchShellRoute(pathname, item);
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      aria-label={item.label}
                      title={item.badge?.title ?? item.label}
                      className={`shell-nav-link${active ? ' is-active' : ''}`}
                    >
                      <span aria-hidden="true" className="shell-nav-link-icon">
                        <ShellNavigationIcon name={item.icon} />
                      </span>
                      <span className="shell-nav-link-label">{item.label}</span>
                      {item.badge ? (
                        <Badge
                          tone={item.badge.tone ?? 'neutral'}
                          title={item.badge.title}
                          className="shell-nav-badge"
                        >
                          {item.badge.label}
                        </Badge>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </nav>

      <div className="shell-sidebar-footer">
        <p className="shell-sidebar-footer-label">Branch and device</p>
        <div className="shell-sidebar-footer-meta">{branchLabel}</div>
        <div className="shell-sidebar-footer-meta">{branchTimezone}</div>
      </div>

      <style>{`
        .shell-sidebar {
          position: sticky;
          top: var(--sc-spacing-4);
          display: grid;
          gap: var(--sc-spacing-4);
          border-radius: var(--sc-radius-xl);
          background: var(--sc-color-brand-700);
          color: var(--sc-color-neutral-0);
          padding: var(--sc-spacing-4);
          box-shadow: var(--sc-shadow-level2);
        }

        .shell-sidebar--collapsed {
          gap: var(--sc-spacing-3);
          padding-inline: var(--sc-spacing-3);
        }

        .shell-sidebar-brand-row {
          display: flex;
          gap: var(--sc-spacing-3);
          align-items: flex-start;
          justify-content: space-between;
        }

        .shell-sidebar-brand {
          display: flex;
          align-items: center;
          gap: var(--sc-spacing-3);
          min-width: 0;
        }

        .shell-sidebar-toggle {
          flex: none;
          border-radius: var(--sc-radius-full);
          border: 1px solid rgba(255, 255, 255, 0.24);
          background: rgba(255, 255, 255, 0.08);
          color: var(--sc-color-neutral-0);
          padding: 6px 10px;
          font-size: var(--sc-font-size-sm);
          display: inline-flex;
          align-items: center;
          gap: var(--sc-spacing-2);
        }

        .shell-sidebar-toggle-icon {
          display: inline-flex;
          width: 1rem;
          height: 1rem;
          flex: none;
        }

        .shell-sidebar-toggle-icon :global(svg) {
          width: 100%;
          height: 100%;
        }

        .shell-sidebar--collapsed .shell-sidebar-toggle {
          width: 2.5rem;
          height: 2.5rem;
          justify-content: center;
          padding: 0;
        }

        .shell-sidebar--collapsed .shell-sidebar-toggle-label {
          display: none;
        }

        .shell-sidebar--collapsed .shell-sidebar-brand {
          justify-content: center;
        }

        .shell-sidebar--collapsed .shell-sidebar-brand-title {
          display: none;
        }

        .shell-sidebar--collapsed .shell-sidebar-brand-row {
          flex-direction: column;
          align-items: center;
        }

        .shell-sidebar-brand-title,
        .shell-sidebar-footer-label,
        .shell-nav-section-label {
          font-weight: 700;
        }

        .shell-sidebar-brand-title {
          letter-spacing: 0.04em;
        }

        .shell-sidebar-brand-subtitle,
        .shell-sidebar-footer-label {
          font-size: var(--sc-font-size-sm);
          opacity: 0.86;
        }

        .shell-sidebar-footer {
          border-top: 1px solid rgba(255, 255, 255, 0.16);
          padding-top: var(--sc-spacing-3);
        }

        .shell-sidebar-footer-meta {
          font-size: var(--sc-font-size-sm);
          opacity: 0.9;
        }

        .shell-nav {
          display: grid;
          gap: var(--sc-spacing-4);
        }

        .shell-nav-section {
          display: grid;
          gap: var(--sc-spacing-2);
        }

        .shell-nav-section-label {
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 0.75rem;
          opacity: 0.78;
        }

        .shell-nav-list {
          list-style: none;
          display: grid;
          gap: var(--sc-spacing-2);
          padding: 0;
          margin: 0;
        }

        .shell-nav-link {
          display: flex;
          align-items: center;
          gap: var(--sc-spacing-2);
          border-radius: var(--sc-radius-md);
          border: 1px solid rgba(255, 255, 255, 0.18);
          padding: 10px 12px;
          text-decoration: none;
          color: inherit;
          background: transparent;
        }

        .shell-nav-link-icon {
          display: inline-flex;
          width: 1rem;
          height: 1rem;
          flex: none;
        }

        .shell-nav-link-icon :global(svg) {
          width: 100%;
          height: 100%;
        }

        .shell-nav-link-label {
          min-width: 0;
        }

        .shell-nav-badge {
          flex: none;
          white-space: nowrap;
          margin-left: auto;
        }

        .shell-nav-link.is-active {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.34);
          font-weight: 700;
        }

        .shell-sidebar--collapsed .shell-sidebar-brand-subtitle,
        .shell-sidebar--collapsed .shell-sidebar-footer,
        .shell-sidebar--collapsed .shell-nav-section-label,
        .shell-sidebar--collapsed .shell-nav-link-label,
        .shell-sidebar--collapsed .shell-nav-badge {
          display: none;
        }

        .shell-sidebar--collapsed .shell-nav {
          gap: var(--sc-spacing-3);
        }

        .shell-sidebar--collapsed .shell-nav-link {
          justify-content: center;
          padding: 10px;
        }

        .shell-sidebar--collapsed .shell-nav-link-icon {
          width: 1.1rem;
          height: 1.1rem;
        }

        .shell-sidebar-toggle:focus-visible,
        .shell-nav-link:focus-visible {
          outline: 3px solid var(--sc-color-warning-300);
          outline-offset: 3px;
        }

        @media (max-width: 767px) {
          .shell-sidebar {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
}
