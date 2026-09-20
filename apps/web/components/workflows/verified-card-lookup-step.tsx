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
    <div
      className="cashier-verified-card-lookup"
      data-od-id="verified-card-lookup"
      aria-labelledby="verified-card-lookup-title"
    >
      <div className="cashier-stage-content">
        <div className="cashier-stage-heading">
          <span className="cashier-stage-kicker">Step 1</span>
          <h2
            id="verified-card-lookup-title"
            className="cashier-stage-heading-title"
          >
            Find customer
          </h2>
          <p className="cashier-stage-heading-description">
            Scan the virtual card, or enter its card serial number.
          </p>
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
    </div>
  );
}
