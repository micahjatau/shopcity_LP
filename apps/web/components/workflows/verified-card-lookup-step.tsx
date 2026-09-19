import type { FormEvent } from 'react';
import { Alert, Button, Input } from '../ui';

export type VerifiedCardLookupStepProps = Readonly<{
  lookupValue: string;
  lookupMessage: string;
  lookupPending: boolean;
  policyMessage?: string;
  onLookup: (event: FormEvent<HTMLFormElement>) => void;
  onQueryChange: (value: string) => void;
}>;

export function VerifiedCardLookupStep({
  lookupValue,
  lookupMessage,
  lookupPending,
  policyMessage,
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
          <p>Scan the virtual card, or enter its card serial number.</p>
        </div>
        <form onSubmit={onLookup} className="cashier-lookup-form">
          <Input
            placeholder="Scan card serial number"
            aria-label="Lookup"
            value={lookupValue}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          <Button type="submit" disabled={lookupPending}>
            {lookupPending ? 'Looking up…' : 'Search customer'}
          </Button>
        </form>
        <Alert tone="info" title="Ready to continue">
          {lookupMessage ||
            policyMessage ||
            'Verify the card before continuing.'}
        </Alert>
      </div>
      <style>{`
        .cashier-verified-card-lookup {
          width: 100%;
        }

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
