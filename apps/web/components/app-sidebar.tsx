import {
  CircleHelp,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ShellNavigationSection } from './shell-navigation';
import { Badge } from './ui';
import { ShellNavigationIcon } from './shell-navigation-icon';
import { matchShellRoute } from './shell-navigation';

export type AppSidebarProps = Readonly<{
  role?: 'CASHIER' | 'SUPERVISOR' | 'ADMIN' | null;
  sections: ShellNavigationSection[];
  pathname: string | null;
  workspaceLabel: string;
  branchLabel: string;
  branchTimezone: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onLogout: () => void;
}>;

export function AppSidebar({
  role = null,
  sections,
  pathname,
  workspaceLabel,
  branchLabel,
  branchTimezone,
  isCollapsed,
  onToggleCollapse,
  onLogout,
}: AppSidebarProps) {
  return (
    <aside
      className={`shell-sidebar shell-sidebar--${role?.toLowerCase() ?? 'default'}${isCollapsed ? ' shell-sidebar--collapsed' : ''}`}
      data-collapsed={isCollapsed ? 'true' : 'false'}
      aria-label="Primary navigation"
    >
      <div className="shell-sidebar-brand-row">
        <div className="shell-sidebar-brand">
          <Image
            className="shell-sidebar-brand-logo"
            src="/brand/Frame%202147224881.svg"
            alt="ShopCity Supermarket"
            width={124}
            height={33}
          />
        </div>
        <button
          type="button"
          className="shell-sidebar-toggle"
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={onToggleCollapse}
        >
          {isCollapsed ? (
            <PanelLeftOpen aria-hidden="true" size={18} strokeWidth={1.8} />
          ) : (
            <PanelLeftClose aria-hidden="true" size={18} strokeWidth={1.8} />
          )}
        </button>
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
          <CircleHelp aria-hidden="true" size={16} strokeWidth={1.8} />
          <span>Help &amp; Training</span>
        </a>
        <button
          type="button"
          className="shell-sidebar-footer-link"
          onClick={onLogout}
        >
          <LogOut aria-hidden="true" size={16} strokeWidth={1.8} />
          <span>Logout</span>
        </button>
        <span className="shell-sidebar-footer-meta" aria-hidden="true">
          {branchLabel} · {branchTimezone}
        </span>
      </div>
    </aside>
  );
}
