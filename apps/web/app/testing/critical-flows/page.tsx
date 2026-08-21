import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Button,
  Input,
  RadioGroup,
  Select,
  Textarea,
} from '../../../components/ui';
import { Money, MoneyInput, StatusBadge } from '../../../components/shopcity';
import {
  ConnectionStatus,
  OfflineIndicator,
  SyncQueueIndicator,
} from '../../../components/offline';
import {
  WorkflowSection,
  PilotHealthPanel,
} from '../../../components/workflows';

export const metadata: Metadata = {
  title: 'ShopCity critical flow fixtures',
  robots: {
    index: false,
    follow: false,
  },
};

export default function CriticalFlowsPage() {
  return (
    <main
      style={{
        display: 'grid',
        gap: 'var(--sc-spacing-6)',
        padding: 'var(--sc-spacing-6)',
      }}
    >
      <header style={{ display: 'grid', gap: 'var(--sc-spacing-2)' }}>
        <p style={eyebrow}>Playwright fixture harness</p>
        <h1 style={{ margin: 0 }}>Critical flow states</h1>
        <p style={muted}>
          Deterministic fixture surface for login, lookup, earning, redemption,
          approvals, offline sync, fraud review and reporting. The interactive
          controls are intentionally disabled fixture markers, not live workflows.
        </p>
        <Link href="/login" style={linkStyle}>
          Open real login route
        </Link>
      </header>

      <WorkflowSection
        title="Login / session"
        description="Session bootstrap and device sign in states."
      >
        <div style={gridTwo}>
          <article style={cardStyle} data-testid="flow-login-session">
            <h2 style={titleStyle}>Session bootstrap</h2>
            <div style={fieldStyle}>
              <span>Tenant / email / username</span>
              <Input aria-label="Tenant" placeholder="cashier@shopcity.local" />
            </div>
            <div style={fieldStyle}>
              <span>Password</span>
              <Input
                aria-label="Password"
                type="password"
                placeholder="••••••••"
              />
            </div>
            <div style={actionsStyle}>
              <Button disabled title="Fixture control only">Fixture sign in</Button>
              <Button disabled title="Fixture control only" variant="secondary">Recover session</Button>
            </div>
          </article>
          <article style={cardStyle} data-testid="flow-session-revocation">
            <h2 style={titleStyle}>Session and device revocation</h2>
            <StatusBadge label="Current device revoked" tone="danger" />
            <p style={muted}>
              The session must be replaced before protected routes continue.
            </p>
            <div style={actionsStyle}>
              <Button disabled title="Fixture control only" variant="secondary">Sign out everywhere</Button>
              <Button disabled title="Fixture control only" variant="danger">Request re-authentication</Button>
            </div>
          </article>
        </div>
      </WorkflowSection>

      <WorkflowSection
        title="Lookup and earn"
        description="Customer lookup, confirmed earn, awaiting approval and duplicate receipt states."
      >
        <div style={gridTwo}>
          <article style={cardStyle} data-testid="flow-lookup">
            <h2 style={titleStyle}>Lookup</h2>
            <Input
              aria-label="Lookup"
              placeholder="Scan card serial or receipt"
            />
            <div style={actionsStyle}>
              <Button disabled title="Fixture control only">Fixture lookup customer</Button>
              <Button disabled title="Fixture control only" variant="secondary">Open duplicate receipt review</Button>
            </div>
          </article>
          <article style={cardStyle} data-testid="flow-earn-confirmed">
            <h2 style={titleStyle}>Earn confirmed</h2>
            <Money amountKobo={375000} signed emphasis="positive" />
            <StatusBadge label="Confirmed" tone="success" />
            <div style={actionsStyle}>
              <Button disabled title="Fixture control only">Fixture print receipt</Button>
              <Button disabled title="Fixture control only" variant="secondary">Add another earn</Button>
            </div>
          </article>
          <article style={cardStyle} data-testid="flow-earn-awaiting-approval">
            <h2 style={titleStyle}>Earn awaiting approval</h2>
            <Money amountKobo={1500000} signed emphasis="normal" />
            <StatusBadge label="Awaiting approval" tone="warning" />
            <p style={muted}>
              High-value earn is paused until a supervisor confirms the receipt.
            </p>
          </article>
          <article style={cardStyle} data-testid="flow-duplicate-receipt">
            <h2 style={titleStyle}>Duplicate receipt</h2>
            <StatusBadge label="Duplicate detected" tone="danger" />
            <Textarea
              aria-label="Duplicate receipt reason"
              placeholder="Explain why this receipt may be duplicated"
              rows={4}
            />
            <div style={actionsStyle}>
              <Button disabled title="Fixture control only" variant="danger">Flag duplicate</Button>
              <Button disabled title="Fixture control only" variant="secondary">Keep pending</Button>
            </div>
          </article>
        </div>
      </WorkflowSection>

      <WorkflowSection
        title="Redeem and approvals"
        description="Online redemption, cap enforcement and decision outcomes."
      >
        <div style={gridTwo}>
          <article style={cardStyle} data-testid="flow-redeem-confirmed">
            <h2 style={titleStyle}>Redeem confirmed</h2>
            <Money amountKobo={120000} signed emphasis="negative" />
            <StatusBadge label="Redeemed" tone="success" />
            <div style={actionsStyle}>
              <Button disabled title="Fixture control only">Print redemption slip</Button>
              <Button disabled title="Fixture control only" variant="secondary">Back to lookup</Button>
            </div>
          </article>
          <article
            style={cardStyle}
            data-testid="flow-redeem-insufficient-balance"
          >
            <h2 style={titleStyle}>Insufficient balance / cap</h2>
            <StatusBadge label="Blocked" tone="danger" />
            <p style={muted}>
              The request exceeds the customer’s available balance and branch
              cap.
            </p>
          </article>
          <article style={cardStyle} data-testid="flow-approval-decision">
            <h2 style={titleStyle}>Approval decision</h2>
            <RadioGroup
              name="approval-decision"
              legend="Decision"
              options={[
                { value: 'approve', label: 'Approve' },
                { value: 'reject', label: 'Reject' },
              ]}
              defaultValue="approve"
            />
            <div style={actionsStyle}>
              <Button disabled title="Fixture control only">Fixture submit decision</Button>
              <Button disabled title="Fixture control only" variant="secondary">Escalate</Button>
            </div>
          </article>
        </div>
      </WorkflowSection>

      <WorkflowSection
        title="Offline, fraud and reports"
        description="Offline earn outcomes, fraud review and reporting freshness."
      >
        <div style={gridTwo}>
          <article style={cardStyle} data-testid="flow-offline-sync">
            <h2 style={titleStyle}>Offline earn sync outcomes</h2>
            <ConnectionStatus />
            <OfflineIndicator />
            <SyncQueueIndicator />
            <div style={fieldStyle}>
              <span>Offline earn amount</span>
              <MoneyInput
                label="Offline earn amount"
                defaultValueKobo={62500}
                hint="Queued locally until sync resumes"
              />
            </div>
          </article>
          <article style={cardStyle} data-testid="flow-fraud-review">
            <h2 style={titleStyle}>Fraud review</h2>
            <StatusBadge label="High severity" tone="danger" />
            <p style={muted}>
              Rule match, manual notes and branch/device context are available
              for review.
            </p>
            <div style={actionsStyle}>
              <Button disabled title="Fixture control only" variant="danger">Escalate</Button>
              <Button disabled title="Fixture control only" variant="secondary">Close review</Button>
            </div>
          </article>
          <article style={cardStyle} data-testid="flow-report-freshness-export">
            <h2 style={titleStyle}>Report freshness / export</h2>
            <StatusBadge label="Fresh" tone="success" />
            <p style={muted}>Last materialized 08:30 WAT.</p>
            <div style={actionsStyle}>
              <Button disabled title="Fixture control only">Fixture refresh report</Button>
              <Button disabled title="Fixture control only" variant="secondary">Export CSV</Button>
            </div>
          </article>
          <article
            style={cardStyle}
            data-testid="flow-session-device-revocation"
          >
            <h2 style={titleStyle}>Session/device revocation</h2>
            <Select
              aria-label="Device"
              placeholder="Select device"
              options={[
                { value: 'cashier-01', label: 'Cashier 01' },
                { value: 'cashier-02', label: 'Cashier 02' },
              ]}
              defaultValue="cashier-01"
            />
            <div style={actionsStyle}>
              <Button disabled title="Fixture control only" variant="danger">Revoke device</Button>
              <Button disabled title="Fixture control only" variant="secondary">Rotate session</Button>
            </div>
          </article>
        </div>
      </WorkflowSection>

      <PilotHealthPanel />
    </main>
  );
}

const cardStyle = {
  display: 'grid',
  gap: 'var(--sc-spacing-3)',
  padding: 'var(--sc-spacing-5)',
  borderRadius: 'var(--sc-radius-xl)',
  background: 'var(--sc-color-neutral-0)',
  border: '1px solid var(--sc-color-semantic-border)',
  boxShadow: 'var(--sc-shadow-level1)',
} as const;

const gridTwo = {
  display: 'grid',
  gap: 'var(--sc-spacing-4)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
} as const;

const fieldStyle = {
  display: 'grid',
  gap: 'var(--sc-spacing-2)',
} as const;

const actionsStyle = {
  display: 'flex',
  gap: 'var(--sc-spacing-3)',
  flexWrap: 'wrap',
} as const;

const titleStyle = {
  margin: 0,
} as const;

const muted = {
  margin: 0,
  color: 'var(--sc-color-semantic-textSecondary)',
} as const;

const eyebrow = {
  margin: 0,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontSize: 'var(--sc-font-size-caption)',
  fontWeight: 700,
  color: 'var(--sc-color-brand-600)',
} as const;

const linkStyle = {
  color: 'var(--sc-color-brand-600)',
  fontWeight: 600,
  width: 'fit-content',
} as const;
