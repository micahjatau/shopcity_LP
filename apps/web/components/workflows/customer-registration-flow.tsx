'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Alert, Button, Input } from '../ui';
import {
  useCustomerRegistrationController,
  type CustomerRegistrationFormState,
} from './use-customer-registration-controller';

const emptyForm: CustomerRegistrationFormState = {
  fullName: '',
  phone: '',
  email: '',
  cardSerialNumber: '',
  isStaff: false,
  loyaltyConsent: false,
  marketingOptIn: false,
};

export function CustomerRegistrationFlow({
  backHref,
}: Readonly<{ backHref: string }>) {
  const [form, setForm] = useState<CustomerRegistrationFormState>(emptyForm);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const { busy, message, saveCustomer, setMessage } =
    useCustomerRegistrationController({
      form,
      setForm,
      selectedId,
      setSelectedId,
      search: async () => undefined,
      reloadSelectedCustomer: async () => undefined,
    });

  useEffect(() => {
    if (message === 'Customer registered.') setStep(4);
  }, [message]);

  function updateForm(
    field: keyof CustomerRegistrationFormState,
    value: string,
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function proceedToConsent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.fullName.trim() || !form.phone.trim()) {
      setMessage('Full name and phone are required.');
      return;
    }
    if (!form.cardSerialNumber.trim()) {
      setMessage('Initial card serial number is required.');
      return;
    }
    setMessage('Capture the customer consent choices.');
    setStep(2);
  }

  function proceedToReview() {
    if (!form.loyaltyConsent) {
      setMessage('Loyalty-service consent is required.');
      return;
    }
    setMessage('Review the customer details and consent choices.');
    setStep(3);
  }

  function resetFlow() {
    setForm(emptyForm);
    setSelectedId(null);
    setStep(1);
    setMessage('Register a customer using the supported account fields.');
  }

  return (
    <section
      className="customer-registration-page"
      data-od-id="register-page"
      aria-labelledby="customer-registration-title"
    >
      <header className="customer-registration-page__header">
        <p className="customer-registration-page__eyebrow">
          Customers · Onboarding
        </p>
        <h1 id="customer-registration-title">Register new customer</h1>
        <p>Enrol the customer, capture consent, and issue an initial card.</p>
      </header>

      <section
        className="customer-registration-flow sc-card sc-card--standard"
        data-od-id="register-flow"
        aria-label="Customer registration"
      >
        <ol
          className="customer-registration-steps"
          aria-label="Registration steps"
        >
          {[
            ['1', 'Customer information'],
            ['2', 'Consent'],
            ['3', 'Review'],
            ['4', 'Success'],
          ].map(([value, label]) => (
            <li
              key={value}
              aria-current={step === Number(value) ? 'step' : undefined}
            >
              <span>{value}</span> {label}
            </li>
          ))}
        </ol>

        <p
          className="customer-registration-status"
          role="status"
          aria-live="polite"
        >
          {message}
        </p>

        {step === 1 ? (
          <form
            className="customer-registration-form"
            data-od-id="register-information"
            onSubmit={proceedToConsent}
          >
            <div className="customer-registration-stage-heading">
              <p>Step 1</p>
              <h2>Customer information</h2>
              <span>
                Name and phone number are required. Phone number is the
                customer&apos;s unique identifier.
              </span>
            </div>
            <label htmlFor="customer-registration-full-name">
              Full name *
              <Input
                id="customer-registration-full-name"
                aria-label="Customer full name"
                autoComplete="name"
                placeholder="Enter full name"
                value={form.fullName}
                onChange={(event) => updateForm('fullName', event.target.value)}
                required
              />
            </label>
            <label htmlFor="customer-registration-phone">
              Phone number *
              <Input
                id="customer-registration-phone"
                aria-label="Customer phone"
                autoComplete="tel"
                inputMode="tel"
                placeholder="Enter phone number"
                value={form.phone}
                onChange={(event) => updateForm('phone', event.target.value)}
                required
              />
            </label>
            <label htmlFor="customer-registration-email">
              Email (optional)
              <Input
                id="customer-registration-email"
                aria-label="Customer email"
                autoComplete="email"
                type="email"
                placeholder="Enter email"
                value={form.email}
                onChange={(event) => updateForm('email', event.target.value)}
              />
            </label>
            <label htmlFor="customer-registration-card">
              Initial card serial number *
              <Input
                id="customer-registration-card"
                aria-label="Initial card serial number"
                placeholder="Enter card serial number"
                value={form.cardSerialNumber}
                onChange={(event) =>
                  updateForm('cardSerialNumber', event.target.value)
                }
                required
              />
            </label>
            <div className="customer-registration-actions">
              <a
                className="sc-button sc-button--secondary sc-button--standard"
                href={backHref}
              >
                Cancel
              </a>
              <Button type="submit">Proceed</Button>
            </div>
          </form>
        ) : null}

        {step === 2 ? (
          <section
            data-od-id="register-consent"
            className="customer-registration-review"
          >
            <div className="customer-registration-stage-heading">
              <p>Step 2</p>
              <h2>Consent</h2>
              <span>Consent version v1.2 · Privacy notice v2.0</span>
            </div>
            <label className="customer-registration-consent">
              <input
                type="checkbox"
                checked={form.loyaltyConsent}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    loyaltyConsent: event.target.checked,
                  }))
                }
                aria-label="Loyalty service consent (required)"
              />
              <span>
                <strong>Loyalty service consent (required)</strong>
                <small>
                  The customer agrees to ShopCity holding purchase and wallet
                  records to operate ShopCity Credit.
                </small>
              </span>
            </label>
            <label className="customer-registration-consent">
              <input
                type="checkbox"
                checked={form.marketingOptIn}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    marketingOptIn: event.target.checked,
                  }))
                }
                aria-label="Marketing opt-in (optional)"
              />
              <span>
                <strong>Marketing opt-in (optional)</strong>
                <small>Offers and campaign messages by WhatsApp or SMS.</small>
              </span>
            </label>
            <Alert tone="info" title="Privacy notice v2.0">
              Wallet data is retained for the life of the account. The customer
              may request export or deletion at any ShopCity branch.
            </Alert>
            <div className="customer-registration-actions">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={proceedToReview}>Proceed</Button>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section
            data-od-id="register-review"
            className="customer-registration-review"
          >
            <div className="customer-registration-stage-heading">
              <p>Step 3</p>
              <h2>Review</h2>
              <span>
                Read the details and consent choices back to the customer before
                creating the account.
              </span>
            </div>
            <dl>
              <div>
                <dt>Full name</dt>
                <dd>{form.fullName}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{form.email || 'Not provided'}</dd>
              </div>
              <div>
                <dt>Phone number</dt>
                <dd>{form.phone}</dd>
              </div>
              <div>
                <dt>Initial card</dt>
                <dd>{form.cardSerialNumber}</dd>
              </div>
              <div>
                <dt>Loyalty consent · v1.2</dt>
                <dd>{form.loyaltyConsent ? 'Granted' : 'Not granted'}</dd>
              </div>
              <div>
                <dt>Marketing opt-in</dt>
                <dd>{form.marketingOptIn ? 'Granted' : 'Declined'}</dd>
              </div>
            </dl>
            {message.includes('required') ? (
              <Alert tone="danger" title="Registration details required">
                {message}
              </Alert>
            ) : null}
            <div className="customer-registration-actions">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                onClick={() => void saveCustomer('create')}
                loading={busy}
              >
                Register customer
              </Button>
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <section
            data-od-id="register-result"
            className="customer-registration-result"
            aria-live="polite"
          >
            <div
              className="customer-registration-result__icon"
              aria-hidden="true"
            >
              ✓
            </div>
            <h2>Registration successful</h2>
            <p>
              The customer account, initial card, and consent record are now
              registered.
            </p>
            <div className="customer-registration-actions">
              <a
                className="sc-button sc-button--secondary sc-button--standard"
                href={backHref}
              >
                Return to customers
              </a>
              <Button onClick={resetFlow}>Register another customer</Button>
            </div>
          </section>
        ) : null}
      </section>
    </section>
  );
}
