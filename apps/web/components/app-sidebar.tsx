import Image from 'next/image';
import Link from 'next/link';
import type { ShellNavigationSection } from './shell-navigation';
import { Badge } from './ui';
import { matchShellRoute } from './shell-navigation';

export type AppSidebarProps = Readonly<{
  sections: ShellNavigationSection[];
  pathname: string | null;
  workspaceLabel: string;
  branchLabel: string;
  branchTimezone: string;
}>;

export function AppSidebar({
  sections,
  pathname,
  workspaceLabel,
  branchLabel,
  branchTimezone,
}: AppSidebarProps) {
  return (
    <aside className="shell-sidebar" aria-label="Primary navigation">
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
                      className={`shell-nav-link${active ? ' is-active' : ''}`}
                    >
                      <span>{item.label}</span>
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

      <style jsx>{`
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

        .shell-sidebar-brand {
          display: flex;
          align-items: center;
          gap: var(--sc-spacing-3);
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
          justify-content: space-between;
          gap: var(--sc-spacing-2);
          border-radius: var(--sc-radius-md);
          border: 1px solid rgba(255, 255, 255, 0.18);
          padding: 10px 12px;
          text-decoration: none;
          color: inherit;
          background: transparent;
        }

        .shell-nav-badge {
          flex: none;
          white-space: nowrap;
        }

        .shell-nav-link.is-active {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.34);
          font-weight: 700;
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
