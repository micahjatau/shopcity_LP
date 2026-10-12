import { ScanLine, Search } from 'lucide-react';
import type { FormEvent } from 'react';
import { useRef } from 'react';
import { Alert, Button, Input } from '../ui';

const IDLE_LOOKUP_PROMPT = 'Scan or type a card serial.';
const PASSIVE_CONTEXT_MESSAGES = new Set([
  'Loading public context…',
  'Public context loaded.',
  'Public context loaded from the session cache.',
  'Using cached public context while refreshing.',
  'Public context pending until sign-in.',
]);

export type VerifiedCardLookupStepProps = Readonly<{
  lookupValue: string;
  lookupMessage: string;
  lookupPending: boolean;
  policyMessage?: string;
  onLookup: (event: FormEvent<HTMLFormElement>) => void;
  onQueryChange: (value: string) => void;
  captureLayout?: boolean;
}>;

export function VerifiedCardLookupStep({
  lookupValue,
  lookupMessage,
  lookupPending,
  policyMessage,
  onLookup,
  onQueryChange,
  captureLayout = false,
}: VerifiedCardLookupStepProps) {
  const cardInputRef = useRef<HTMLInputElement | null>(null);
  const policyNotice =
    captureLayout &&
    policyMessage &&
    !PASSIVE_CONTEXT_MESSAGES.has(policyMessage)
      ? policyMessage
      : '';
  const statusMessage = captureLayout
    ? lookupMessage === IDLE_LOOKUP_PROMPT
      ? policyNotice
      : lookupMessage || policyNotice
    : lookupMessage || policyMessage || 'Verify the card before continuing.';

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
            ref={cardInputRef}
            placeholder={
              captureLayout
                ? 'Scan card or Search card number'
                : 'Scan card serial number'
            }
            aria-label="Lookup"
            value={lookupValue}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          <Button
            type="submit"
            aria-label={
              captureLayout
                ? lookupPending
                  ? 'Looking up…'
                  : 'Search customer'
                : undefined
            }
            disabled={lookupPending}
            className={
              captureLayout
                ? 'cashier-capture-search-action cashier-capture-search-primary'
                : undefined
            }
          >
            {captureLayout ? (
              <Search aria-hidden="true" size={16} strokeWidth={1.8} />
            ) : null}
            {lookupPending
              ? 'Looking up…'
              : captureLayout
                ? 'Search'
                : 'Search customer'}
          </Button>
          {captureLayout ? (
            <Button
              type="button"
              variant="secondary"
              className="cashier-capture-search-action"
              onClick={() => cardInputRef.current?.focus()}
            >
              <ScanLine aria-hidden="true" size={16} strokeWidth={1.8} />
              Scan
            </Button>
          ) : null}
        </form>
        {captureLayout ? (
          statusMessage ? (
            <Alert tone="info">{statusMessage}</Alert>
          ) : null
        ) : (
          <Alert tone="info" title="Ready to continue">
            {statusMessage}
          </Alert>
        )}
      </div>
    </div>
  );
}
