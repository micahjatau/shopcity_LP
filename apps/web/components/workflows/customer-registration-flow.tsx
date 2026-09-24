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
};

export function CustomerRegistrationFlow({
  backHref,
}: Readonly<{ backHref: string }>) {
  const [form, setForm] = useState<CustomerRegistrationFormState>(emptyForm);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
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
    if (message === 'Customer registered.') setStep(3);
  }, [message]);

  function updateForm(
    field: keyof CustomerRegistrationFormState,
    value: string,
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function proceedToReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.fullName.trim() || !form.phone.trim()) {
      setMessage('Full name and phone are required.');
      return;
    }
    if (!form.cardSerialNumber.trim()) {
      setMessage('Initial card serial number is required.');
      return;
    }
    setMessage('Review the supported customer and initial-card details.');
    setStep(2);
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
        <p>
          Create a customer account with the supported profile and initial-card
          details.
        </p>
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
            ['2', 'Review'],
            ['3', 'Result'],
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
            onSubmit={proceedToReview}
          >
            <div className="customer-registration-stage-heading">
              <p>Step 1</p>
              <h2>Customer information</h2>
              <span>
                Full name, phone number, and an initial card are required.
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
              <Button type="submit">Review details</Button>
            </div>
          </form>
        ) : null}

        {step === 2 ? (
          <section
            data-od-id="register-review"
            className="customer-registration-review"
          >
            <div className="customer-registration-stage-heading">
              <p>Step 2</p>
              <h2>Review details</h2>
              <span>
                Confirm the supported registration details before submitting.
              </span>
            </div>
            <dl>
              <div>
                <dt>Full name</dt>
                <dd>{form.fullName}</dd>
              </div>
              <div>
                <dt>Phone number</dt>
                <dd>{form.phone}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{form.email || 'Not provided'}</dd>
              </div>
              <div>
                <dt>Initial card</dt>
                <dd>{form.cardSerialNumber}</dd>
              </div>
            </dl>
            {message.includes('required') ? (
              <Alert tone="danger" title="Registration details required">
                {message}
              </Alert>
            ) : null}
            <div className="customer-registration-actions">
              <Button variant="secondary" onClick={() => setStep(1)}>
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

        {step === 3 ? (
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
            <p>The customer account and initial card are now registered.</p>
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
