import type { FormEvent } from 'react';
import { Button, Input } from '../ui';
import type { CashierDiscoveryRecord } from './use-cashier-lookup-controller';

export type VerifiedCardLookupStepProps = Readonly<{
  lookupValue: string;
  lookupMessage: string;
  lookupPending: boolean;
  policyMessage?: string;
  discoveryMatches?: CashierDiscoveryRecord[];
  onLookup: (event: FormEvent<HTMLFormElement>) => void;
  onQueryChange: (value: string) => void;
}>;

export function VerifiedCardLookupStep({
  lookupValue,
  lookupMessage,
  lookupPending,
  policyMessage,
  discoveryMatches = [],
  onLookup,
  onQueryChange,
}: VerifiedCardLookupStepProps) {
  return (
    <section
      className="cashier-card cashier-earn-stage cashier-verified-card-lookup"
      data-od-id="verified-card-lookup"
      aria-labelledby="verified-card-lookup-title"
    >
      <div className="cashier-stage-content">
        <div className="cashier-stage-heading">
          <span className="cashier-stage-kicker">Step 1</span>
          <h2 id="verified-card-lookup-title">Find customer</h2>
          <p>
            Find a customer by name or phone, or scan their active card to
            continue.
          </p>
        </div>
        <form onSubmit={onLookup} className="cashier-lookup-form">
          <Input
            placeholder="Name, phone, or active card serial"
            aria-label="Lookup"
            value={lookupValue}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          <Button type="submit" disabled={lookupPending}>
            {lookupPending ? 'Looking up…' : 'Search customer'}
          </Button>
        </form>
        <p className="cashier-lookup-notice" role="status">
          {lookupMessage || policyMessage || 'Search to continue.'}
        </p>
        {discoveryMatches.length > 0 ? (
          <div
            className="cashier-lookup-matches"
            aria-label="Customer search results"
          >
            {discoveryMatches.map((customer, index) => (
              <div
                className="cashier-lookup-match"
                key={customer.customerId ?? customer.id ?? index}
              >
                <strong>{customer.fullName ?? 'Customer'}</strong>
                <span>{customer.maskedPhone ?? 'Phone unavailable'}</span>
              </div>
            ))}
            <p>
              Customer discovery does not verify a card. Scan or enter the
              active card serial above to continue.
            </p>
          </div>
        ) : null}
      </div>
      <style>{`
        .cashier-verified-card-lookup {
          width: min(860px, 100%);
          margin: 0 auto;
          padding: clamp(24px, 4vw, 40px);
          border: 1px solid var(--sc-prototype-border);
          border-radius: 16px;
          background: var(--sc-prototype-surface);
          box-shadow: none;
        }
        .cashier-verified-card-lookup .cashier-stage-heading { display: grid; gap: 5px; border-bottom: 1px solid var(--sc-prototype-border); padding-bottom: 16px; }
        .cashier-verified-card-lookup .cashier-stage-heading h2,
        .cashier-verified-card-lookup .cashier-stage-heading p { margin: 0; }
        .cashier-verified-card-lookup .cashier-stage-heading p,
        .cashier-lookup-notice { font-size: 12px; color: var(--sc-prototype-muted); }
        .cashier-lookup-notice { margin: 0; min-height: 18px; }
        .cashier-lookup-matches { display: grid; gap: 8px; }
        .cashier-lookup-match { display: grid; gap: 3px; padding: 12px 14px; border: 1px solid var(--sc-prototype-border); border-radius: 12px; }
        .cashier-lookup-match span,
        .cashier-lookup-matches p { color: var(--sc-prototype-muted); font-size: 12px; margin: 0; }

        .cashier-verified-card-lookup .cashier-stage-content {
          display: grid;
          gap: var(--sc-spacing-4);
        }

        .cashier-verified-card-lookup .cashier-lookup-form {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: var(--sc-spacing-3);
        }

        @media (max-width: 620px) {
          .cashier-verified-card-lookup .cashier-lookup-form {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
