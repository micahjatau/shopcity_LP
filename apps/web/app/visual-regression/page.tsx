import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Checkbox,
  Dialog,
  DropdownMenu,
  Input,
  Pagination,
  Popover,
  Progress,
  RadioGroup,
  Select,
  Separator,
  Sheet,
  Skeleton,
  Table,
  Tabs,
  Textarea,
  Toast,
  Tooltip,
} from '../../components/ui';
import { Money, MoneyInput, StatusBadge } from '../../components/shopcity';
import {
  ConnectionStatus,
  OfflineIndicator,
  SyncQueueIndicator,
} from '../../components/offline';
import { WorkflowSection } from '../../components/workflows';

export const metadata: Metadata = {
  title: 'ShopCity visual regression gallery',
  robots: {
    index: false,
    follow: false,
  },
};

export default function VisualRegressionPage() {
  return (
    <main
      style={{
        display: 'grid',
        gap: 'var(--sc-spacing-6)',
        padding: 'var(--sc-spacing-6)',
        background: 'var(--sc-color-canvas)',
      }}
    >
      <GallerySection
        id="visual-primitives"
        title="Primitives"
        description="Core input, action and choice controls."
      >
        <div className="visual-grid">
          <Button>Primary action</Button>
          <Button variant="secondary">Secondary action</Button>
          <Button variant="danger">Danger action</Button>
          <Input aria-label="Lookup" placeholder="Search customers" />
          <Textarea aria-label="Notes" placeholder="Add notes" rows={4} />
          <div className="visual-checkbox">
            <Checkbox aria-label="Remember this device" />
            <span>Remember this device</span>
          </div>
          <RadioGroup
            name="receipt-channel"
            legend="Receipt channel"
            options={[
              { value: 'sms', label: 'SMS' },
              { value: 'print', label: 'Print' },
            ]}
            defaultValue="sms"
          />
          <Select
            aria-label="Route"
            placeholder="Select route"
            options={[
              { value: 'cashier', label: 'Cashier' },
              { value: 'supervisor', label: 'Supervisor' },
            ]}
            defaultValue="cashier"
          />
          <MoneyInput
            label="Amount"
            defaultValueKobo={125000}
            hint="Enter naira only"
          />
        </div>
      </GallerySection>

      <GallerySection
        id="visual-status-badges"
        title="Status badges"
        description="Semantic tones with label and icon treatment."
      >
        <div className="visual-badges">
          <StatusBadge label="Confirmed" tone="success" />
          <StatusBadge label="Awaiting approval" tone="warning" />
          <StatusBadge label="Offline" tone="danger" />
          <StatusBadge label="Review" tone="info" />
          <StatusBadge label="Neutral" tone="neutral" />
        </div>
      </GallerySection>

      <GallerySection
        id="visual-transaction-confirmation"
        title="Transaction confirmation"
        description="Success state with amount, customer and next actions."
      >
        <article className="visual-panel visual-panel--brand">
          <p className="visual-eyebrow">Earn confirmed</p>
          <h3 style={{ margin: 0 }}>Receipt #SC-2041</h3>
          <p style={{ margin: 0 }}>
            <Money
              amountKobo={375000}
              signed
              emphasis="positive"
              label="Three thousand seven hundred and fifty naira"
            />{' '}
            credited to Chidi Okafor.
          </p>
          <div className="visual-actions">
            <Button variant="secondary">Print receipt</Button>
            <Button>Done</Button>
          </div>
        </article>
      </GallerySection>

      <GallerySection
        id="visual-approval-decision"
        title="Approval decision"
        description="Supervisor review state with approve and reject controls."
      >
        <article className="visual-panel">
          <p className="visual-eyebrow">Needs approval</p>
          <h3 style={{ margin: 0 }}>Receipt #SC-2099</h3>
          <p
            style={{
              margin: 0,
              color: 'var(--sc-color-semantic-textSecondary)',
            }}
          >
            Customer balance is below the requested redemption amount.
          </p>
          <div className="visual-actions">
            <Button variant="danger">Reject</Button>
            <Button>Approve</Button>
          </div>
        </article>
      </GallerySection>

      <GallerySection
        id="visual-offline-queue"
        title="Offline queue"
        description="Connectivity, offline banner and local sync queue state."
      >
        <div className="visual-stack">
          <ConnectionStatus />
          <OfflineIndicator />
          <SyncQueueIndicator />
          <article className="visual-panel">
            <h3 style={{ margin: 0 }}>Queued earn records</h3>
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
              <li>Local ID: earn_01 — awaiting sync</li>
              <li>Local ID: earn_02 — sync failed</li>
            </ul>
          </article>
        </div>
      </GallerySection>

      <GallerySection
        id="visual-dialogs"
        title="Dialogs"
        description="Consequential confirmation and cancellation surfaces."
      >
        <div className="visual-dialog">
          <div className="visual-dialog__backdrop" />
          <article className="visual-dialog__panel">
            <p className="visual-eyebrow">Confirm action</p>
            <h3 style={{ margin: 0 }}>Redeem 1,500.00 NGN?</h3>
            <p
              style={{
                margin: 0,
                color: 'var(--sc-color-semantic-textSecondary)',
              }}
            >
              This action will deduct from the customer’s balance immediately.
            </p>
            <div className="visual-actions">
              <Button variant="secondary">Cancel</Button>
              <Button variant="danger">Confirm redeem</Button>
            </div>
          </article>
        </div>
      </GallerySection>

      <GallerySection
        id="visual-table"
        title="Data table"
        description="A compact, readable grid with row selection affordances."
      >
        <div className="visual-table-wrap">
          <table className="visual-table">
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>SC-2041</td>
                <td>Chidi Okafor</td>
                <td>
                  <StatusBadge label="Confirmed" tone="success" />
                </td>
                <td>
                  <Money amountKobo={375000} />
                </td>
              </tr>
              <tr>
                <td>SC-2099</td>
                <td>Amina Bello</td>
                <td>
                  <StatusBadge label="Awaiting approval" tone="warning" />
                </td>
                <td>
                  <Money amountKobo={150000} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </GallerySection>

      <GallerySection
        id="visual-expanded-surfaces"
        title="Expanded surfaces"
        description="Shared primitives used by the broader product surface."
      >
        <div className="visual-stack">
          <div className="visual-badges">
            <Badge tone="brand">Brand</Badge>
            <Badge tone="success">Success</Badge>
            <Badge tone="warning">Warning</Badge>
            <Badge tone="danger">Danger</Badge>
          </div>
          <Alert tone="info" title="Info notice">
            Shared primitives now include feedback and navigation surfaces.
          </Alert>
          <Progress value={72} />
          <Skeleton style={{ height: 24, width: '60%' }} />
          <Separator />
          <Tabs
            defaultValue="one"
            items={[
              { value: 'one', label: 'One', panel: <p>Tabbed content one.</p> },
              { value: 'two', label: 'Two', panel: <p>Tabbed content two.</p> },
            ]}
          />
          <Accordion
            items={[
              {
                value: 'a',
                label: 'Accordion A',
                content: <p>Accordion content A.</p>,
              },
              {
                value: 'b',
                label: 'Accordion B',
                content: <p>Accordion content B.</p>,
              },
            ]}
          />
          <div className="visual-actions">
            <Tooltip content="Helpful tooltip">
              <Button>Tooltip target</Button>
            </Tooltip>
            <Button>Toast trigger</Button>
          </div>
          <Dialog open title="Dialog">
            Dialog content.
          </Dialog>
          <Sheet open title="Sheet">
            Sheet content.
          </Sheet>
          <Popover open>Popover content.</Popover>
          <DropdownMenu open>Menu item</DropdownMenu>
          <Toast>Saved locally.</Toast>
          <Pagination
            currentPage={2}
            totalPages={4}
            hrefForPage={(page) => `?page=${page}`}
          />
          <div className="visual-table-wrap">
            <Table>
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>One</td>
                  <td>Alpha</td>
                </tr>
                <tr>
                  <td>Two</td>
                  <td>Beta</td>
                </tr>
              </tbody>
            </Table>
          </div>
        </div>
      </GallerySection>

      <GallerySection
        id="visual-report-workspace"
        title="Report workspace"
        description="Filters, freshness and export affordances."
      >
        <div className="visual-stack">
          <WorkflowSection
            title="Operations snapshot"
            description="Fresh at 08:30 WAT — authorized data only."
          >
            <div className="visual-actions">
              <Button variant="secondary">Last 7 days</Button>
              <Button variant="secondary">Export CSV</Button>
              <Button>Refresh</Button>
            </div>
          </WorkflowSection>
          <article className="visual-panel">
            <div className="visual-badges">
              <StatusBadge label="Live" tone="success" />
              <StatusBadge label="Reconciliation available" tone="info" />
            </div>
            <h3 style={{ margin: 0 }}>Pilot health</h3>
            <p
              style={{
                margin: 0,
                color: 'var(--sc-color-semantic-textSecondary)',
              }}
            >
              Pilot health loaded from deterministic visual fixture data.
            </p>
            <div className="visual-grid">
              <StatusBadge label="Outbox healthy" tone="success" />
              <StatusBadge label="SMS clear" tone="success" />
              <StatusBadge label="Offline sync review" tone="warning" />
              <StatusBadge label="Reports fresh" tone="success" />
            </div>
          </article>
        </div>
      </GallerySection>

      <GallerySection
        id="visual-shell-states"
        title="Shell states"
        description="Expanded sidebar, collapsed rail, tablet rail and mobile drawer."
      >
        <div className="visual-grid">
          <ShellStatePreview
            label="Expanded sidebar"
            route="/cashier"
            detail="Full labels, badges, and branch context remain visible."
            width="240px"
          />
          <ShellStatePreview
            label="Collapsed rail"
            route="/cashier/earn"
            detail="Icons and labels shrink into a narrow rail with accessible targets."
            width="84px"
            collapsed
          />
          <ShellStatePreview
            label="Tablet rail"
            route="/supervisor/approvals"
            detail="Tablet keeps the rail pattern instead of a squeezed desktop column."
            width="84px"
            collapsed
          />
          <ShellStatePreview
            label="Mobile drawer"
            route="/admin/transactions"
            detail="The drawer presents the same navigation in a focused modal layout."
            width="100%"
            mobile
          />
        </div>
      </GallerySection>

      <GallerySection
        id="visual-role-shells"
        title="Role shells"
        description="Login, cashier, supervisor and admin entry surfaces."
      >
        <div className="visual-grid">
          <article className="visual-panel">
            <p className="visual-eyebrow">Login</p>
            <h3 style={{ margin: 0 }}>Bootstrap sign in</h3>
            <p style={{ margin: 0 }}>
              Authentication stays local with role-gated redirects after sign in.
            </p>
            <div className="visual-actions">
              <Button variant="secondary">Admin</Button>
              <Button>Cashier</Button>
            </div>
          </article>
          <article className="visual-panel">
            <p className="visual-eyebrow">Cashier</p>
            <h3 style={{ margin: 0 }}>Fast earn and redeem shell</h3>
            <p style={{ margin: 0 }}>
              Lookup, earn, redeem and sync entry points.
            </p>
            <div className="visual-actions">
              <Button>Lookup</Button>
              <Button variant="secondary">Sync</Button>
            </div>
          </article>
          <article className="visual-panel">
            <p className="visual-eyebrow">Supervisor</p>
            <h3 style={{ margin: 0 }}>Approvals and fraud review shell</h3>
            <p style={{ margin: 0 }}>
              Queue, approval and reports entry points.
            </p>
            <div className="visual-actions">
              <Button>Approvals</Button>
              <Button variant="secondary">Reports</Button>
            </div>
          </article>
          <article className="visual-panel">
            <p className="visual-eyebrow">Admin</p>
            <h3 style={{ margin: 0 }}>Operations and audit shell</h3>
            <p style={{ margin: 0 }}>
              Tenant-wide operations, audit and device controls.
            </p>
            <div className="visual-actions">
              <Button>Operations</Button>
              <Button variant="secondary">Audit</Button>
            </div>
          </article>
        </div>
      </GallerySection>
    </main>
  );
}

function ShellStatePreview({
  label,
  route,
  detail,
  width,
  collapsed = false,
  mobile = false,
}: Readonly<{
  label: string;
  route: string;
  detail: string;
  width: string;
  collapsed?: boolean;
  mobile?: boolean;
}>) {
  return (
    <article
      style={{
        borderRadius: 'var(--sc-radius-xl)',
        border: '1px solid var(--sc-color-semantic-border)',
        background: 'var(--sc-color-neutral-0)',
        boxShadow: 'var(--sc-shadow-level1)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: mobile ? '1fr' : `${width} minmax(0, 1fr)`,
          minHeight: mobile ? 160 : 180,
        }}
      >
        <aside
          style={{
            background: 'var(--sc-color-brand-700)',
            color: 'var(--sc-color-neutral-0)',
            padding: 'var(--sc-spacing-3)',
            display: 'grid',
            gap: 'var(--sc-spacing-2)',
            alignContent: 'start',
          }}
        >
          <strong>{label}</strong>
          <span style={{ fontSize: 'var(--sc-font-size-sm)', opacity: 0.86 }}>
            {collapsed || mobile ? 'Rail / drawer' : 'Sidebar'}
          </span>
          <div style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
            <span
              style={{
                height: 10,
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.32)',
                width: collapsed || mobile ? 32 : 92,
              }}
            />
            <span
              style={{
                height: 10,
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.22)',
                width: collapsed || mobile ? 20 : 112,
              }}
            />
            <span
              style={{
                height: 10,
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.22)',
                width: collapsed || mobile ? 24 : 104,
              }}
            />
          </div>
        </aside>
        <div
          style={{
            display: 'grid',
            gap: 'var(--sc-spacing-3)',
            padding: 'var(--sc-spacing-4)',
          }}
        >
          <p style={{ margin: 0, fontSize: 'var(--sc-font-size-sm)' }}>{route}</p>
          <h3 style={{ margin: 0 }}>{label}</h3>
          <p
            style={{
              margin: 0,
              color: 'var(--sc-color-semantic-textSecondary)',
            }}
          >
            {detail}
          </p>
          <div className="visual-actions">
            <Button variant="secondary">Lookup</Button>
            <Button>Earn</Button>
          </div>
        </div>
      </div>
    </article>
  );
}

function GallerySection({
  id,
  title,
  description,
  children,
}: Readonly<{
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}>) {
  return (
    <section
      data-testid={id}
      style={{
        borderRadius: 'var(--sc-radius-xl)',
        padding: 'var(--sc-spacing-5)',
        background: 'var(--sc-color-neutral-0)',
        border: '1px solid var(--sc-color-semantic-border)',
        boxShadow: 'var(--sc-shadow-level1)',
        display: 'grid',
        gap: 'var(--sc-spacing-4)',
      }}
    >
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-1)' }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <p
          style={{ margin: 0, color: 'var(--sc-color-semantic-textSecondary)' }}
        >
          {description}
        </p>
      </header>
      {children}
    </section>
  );
}
