import Image from 'next/image';
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
          {!captureLayout ? (
            <span className="cashier-stage-kicker">Step 1</span>
          ) : null}
          <h2
            id="verified-card-lookup-title"
            className="cashier-stage-heading-title"
          >
            {captureLayout ? 'Step 1 — Find customer' : 'Find customer'}
          </h2>
          <p className="cashier-stage-heading-description">
            {captureLayout
              ? 'Scan the virtual card, or search by phone number or card serial.'
              : 'Scan the virtual card, or enter its card serial number.'}
          </p>
        </div>
        <form onSubmit={onLookup} className="cashier-lookup-form">
          {captureLayout ? (
            <div className="cashier-capture-search-field">
              <Image
                src="/brand/cashier/cashier-capture-step1-input-search.svg"
                alt=""
                aria-hidden="true"
                width={12}
                height={12}
              />
              <Input
                ref={cardInputRef}
                placeholder="Search"
                aria-label="Lookup"
                value={lookupValue}
                onChange={(event) => onQueryChange(event.target.value)}
              />
            </div>
          ) : (
            <Input
              ref={cardInputRef}
              placeholder="Scan card serial number"
              aria-label="Lookup"
              value={lookupValue}
              onChange={(event) => onQueryChange(event.target.value)}
            />
          )}
          {captureLayout ? (
            <div className="cashier-capture-search-actions">
              <Button
                type="submit"
                aria-label={lookupPending ? 'Looking up…' : 'Search customer'}
                disabled={lookupPending}
                className="cashier-capture-search-action cashier-capture-search-primary"
              >
                <Image
                  src="/brand/cashier/cashier-capture-step1-search-icon.svg"
                  alt=""
                  aria-hidden="true"
                  width={16}
                  height={16}
                />
                {lookupPending ? 'Looking up…' : 'Search'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="cashier-capture-search-action cashier-capture-search-action--scan"
                onClick={() => cardInputRef.current?.focus()}
              >
                <Image
                  src="/brand/cashier/cashier-capture-step1-scan-grid.svg"
                  alt=""
                  aria-hidden="true"
                  width={16}
                  height={16}
                />
                Scan
              </Button>
            </div>
          ) : (
            <Button type="submit" disabled={lookupPending}>
              {lookupPending ? 'Looking up…' : 'Search customer'}
            </Button>
          )}
        </form>
        {captureLayout ? (
          <p className="cashier-capture-search-hint">
            Target lookup speed is under 5 seconds. Press Enter to search.
          </p>
        ) : null}
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
