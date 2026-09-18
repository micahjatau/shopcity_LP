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
  onLogout: () => void;
}>;

export function AppSidebar({
  sections,
  pathname,
  workspaceLabel,
  branchLabel,
  branchTimezone,
  isCollapsed,
  onLogout,
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
            <div className="shell-sidebar-brand-title">SHOPCITY</div>
            <div className="shell-sidebar-brand-subtitle">SUPERMARKET</div>
          </div>
        </div>
      </div>

      <nav aria-label="Primary navigation" className="shell-nav">
        {sections.map((section) => (
          <section key={section.id} className="shell-nav-section">
            <p className="shell-nav-section-label">{section.label}</p>
            <ul className="shell-nav-list">
              {section.items.map((item) => {
                const active = matchShellRoute(pathname, item);
                const accessibleLabel =
                  item.id === 'cashier-lookup'
                    ? 'Find Customer Lookup'
                    : item.id === 'cashier-earn'
                      ? 'Capture Purchase Earn'
                      : item.id === 'cashier-redeem'
                        ? 'Redeem Credit Redeem'
                        : item.label;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      aria-label={accessibleLabel}
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
        <a href="/help" className="shell-sidebar-footer-link">
          Help &amp; Training
        </a>
        <button
          type="button"
          className="shell-sidebar-footer-link"
          onClick={onLogout}
        >
          Logout
        </button>
        <span className="shell-sidebar-footer-meta" aria-hidden="true">
          {branchLabel} · {branchTimezone}
        </span>
      </div>

      <style>{`
        .shell-sidebar {
          position: sticky;
          top: 0;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          gap: var(--sc-spacing-4);
          border-radius: 0;
          background: var(--sc-color-brand-700);
          color: var(--sc-color-neutral-0);
          padding: 28px 12px 22px;
          box-shadow: none;
        }

        .shell-sidebar--collapsed {
          gap: var(--sc-spacing-3);
          padding-inline: var(--sc-spacing-3);
        }

        .shell-sidebar-brand-row {
          display: flex;
          gap: var(--sc-spacing-3);
          align-items: center;
          justify-content: space-between;
          padding: 0 12px 18px;
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
          font-size: 16px;
          letter-spacing: 0.02em;
          line-height: 1.05;
        }

        .shell-sidebar-brand-subtitle {
          margin-top: 3px;
          font-size: 9px;
          letter-spacing: 0.06em;
          line-height: 1.05;
          opacity: 0.8;
        }

        .shell-sidebar-footer-label {
          font-size: 11px;
          opacity: 0.86;
        }

        .shell-sidebar-footer {
          margin-top: auto;
          border-top: 1px solid color-mix(in oklch, var(--sc-color-neutral-0) 55%, transparent);
          padding-top: 18px;
        }

        .shell-sidebar-footer-meta {
          display: block;
          margin-top: 8px;
          font-size: var(--sc-font-size-sm);
          opacity: 0.9;
        }

        .shell-sidebar-footer-link {
          display: block;
          width: 100%;
          padding: 6px 0;
          border: 0;
          background: transparent;
          color: inherit;
          font: inherit;
          text-align: left;
          cursor: pointer;
        }

        .shell-sidebar-footer-link:hover,
        .shell-sidebar-footer-link:focus-visible {
          text-decoration: underline;
        }

        .shell-nav {
          display: grid;
          gap: 7px;
        }

        .shell-nav-section {
          display: grid;
          gap: var(--sc-spacing-2);
        }

        .shell-nav-section + .shell-nav-section {
          border-top: 1px solid rgba(255, 255, 255, 0.16);
          padding-top: var(--sc-spacing-4);
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
          gap: 7px;
          padding: 0;
          margin: 0;
        }

        .shell-nav-link {
          display: flex;
          align-items: center;
          gap: 14px;
          min-height: 44px;
          border-radius: 999px;
          border: 0;
          padding: 0 14px;
          text-decoration: none;
          color: inherit;
          background: transparent;
          font-size: 15px;
          transition: background-color 160ms ease, color 160ms ease,
            transform 160ms ease;
        }

        .shell-nav-link:hover {
          background: color-mix(in oklch, var(--sc-color-neutral-0) 14%, transparent);
        }

        .shell-nav-link:active {
          transform: translateY(1px);
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
          background: var(--sc-color-neutral-0);
          color: var(--sc-color-brand-700);
          font-weight: 650;
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

        @media (prefers-reduced-motion: reduce) {
          .shell-nav-link {
            transition: none;
          }
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
