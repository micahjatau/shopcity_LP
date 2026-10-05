'use client';

import { Button, Dialog } from '../ui';

export type CustomerRegistrationPreview = Readonly<{
  fullName: string;
  phone: string;
  email?: string;
  cardSerialNumber: string;
}>;

export function CustomerRegistrationReviewDialog({
  open,
  customer,
  onEdit,
  onConfirm,
  busy,
}: Readonly<{
  open: boolean;
  customer: CustomerRegistrationPreview;
  onEdit: () => void;
  onConfirm: () => void | Promise<void>;
  busy: boolean;
}>) {
  return (
    <Dialog
      open={open}
      title="Review customer details"
      onClose={() => {
        if (!busy) onEdit();
      }}
    >
      <div className="sc-registration-review">
        <button
          type="button"
          aria-label="Close registration review"
          className="sc-registration-review__close"
          disabled={busy}
          onClick={onEdit}
        >
          <span aria-hidden="true">×</span>
        </button>
        <p className="sc-registration-review__subtitle">
          Confirm the information before registering this customer and their
          first loyalty card.
        </p>
        <section
          className="sc-registration-review__section"
          aria-labelledby="registration-review-customer-title"
        >
          <h3 id="registration-review-customer-title">Customer</h3>
          <dl className="sc-registration-review__fields">
            <div>
              <dt>Full name</dt>
              <dd>{customer.fullName}</dd>
            </div>
            <div>
              <dt>Phone number</dt>
              <dd>{customer.phone}</dd>
            </div>
            <div className="sc-registration-review__email">
              <dt>Email</dt>
              <dd>{customer.email?.trim() || 'Not provided'}</dd>
            </div>
          </dl>
        </section>
        <section
          className="sc-registration-review__section sc-registration-review__card"
          aria-labelledby="registration-review-card-title"
        >
          <h3 id="registration-review-card-title">Initial loyalty card</h3>
          <dl className="sc-registration-review__fields">
            <div className="sc-registration-review__card-field">
              <dt>Card serial</dt>
              <dd>{customer.cardSerialNumber}</dd>
            </div>
          </dl>
        </section>
        <div className="sc-registration-review__actions">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={onEdit}
          >
            Edit details
          </Button>
          <Button
            type="button"
            loading={busy}
            disabled={busy}
            onClick={() => void onConfirm()}
          >
            Register customer
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
