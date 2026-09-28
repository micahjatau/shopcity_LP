'use client';

import Link from 'next/link';
import { Button, Dialog } from '../ui';

export type SupervisorCustomerPreviewRecord = {
  id?: string;
  fullName?: string;
  phoneE164?: string;
  email?: string;
  status?: string;
  activeCardStatus?: string;
  activeCardSerialNumber?: string;
  activeCard?: unknown;
};

export function SupervisorCustomerPreviewDialog({
  open,
  customer,
  onClose,
  continueLabel,
  cardTaskHref,
}: Readonly<{
  open: boolean;
  customer: SupervisorCustomerPreviewRecord | null;
  onClose: () => void;
  continueLabel: string;
  cardTaskHref?: string;
}>) {
  const linkedCard =
    customer?.activeCard && typeof customer.activeCard === 'object'
      ? (customer.activeCard as Record<string, unknown>)
      : null;
  const name = customer?.fullName?.trim() || 'Customer';
  const phone = customer?.phoneE164?.trim() ?? '';
  const phoneHref = phone.replace(/[^\d+]/g, '');
  const email = customer?.email?.trim() ?? '';
  const emailHref = email.replace(/[\r\n]/g, '');
  const cardStatus =
    customer?.activeCardStatus ??
    (typeof linkedCard?.status === 'string'
      ? linkedCard.status
      : 'Unavailable');
  const cardSerial =
    customer?.activeCardSerialNumber ??
    (typeof linkedCard?.serialNumber === 'string'
      ? linkedCard.serialNumber
      : 'Unavailable');

  return (
    <Dialog
      open={open && customer !== null}
      title="Customer preview"
      onClose={onClose}
    >
      {customer ? (
        <div className="sc-customer-preview grid gap-4">
          <button
            type="button"
            aria-label="Close customer preview"
            className="sc-customer-preview__close"
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
          <p className="sc-customer-preview__subtitle">
            Verified details for {name}
          </p>
          <dl className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-sm font-medium">Customer</dt>
              <dd className="break-words">{name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium">Customer status</dt>
              <dd>{customer.status ?? 'Unavailable'}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-sm font-medium">Phone number</dt>
              <dd className="break-all">
                {phone && phoneHref ? (
                  <a
                    aria-label={`Call ${name}`}
                    className="underline underline-offset-4 focus-visible:outline focus-visible:outline-2"
                    href={`tel:${phoneHref}`}
                  >
                    {phone}
                  </a>
                ) : (
                  'Not provided'
                )}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-sm font-medium">Email</dt>
              <dd className="break-all">
                {email && emailHref ? (
                  <a
                    aria-label={`Email ${name}`}
                    className="underline underline-offset-4 focus-visible:outline focus-visible:outline-2"
                    href={`mailto:${emailHref}`}
                  >
                    {email}
                  </a>
                ) : (
                  'Not provided'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium">Card status</dt>
              <dd>{cardStatus}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-sm font-medium">Card serial</dt>
              <dd className="break-all">{cardSerial}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap justify-end gap-3">
            {cardTaskHref ? (
              <Link
                className="inline-flex min-h-10 items-center rounded-md px-3 font-medium text-red-800 underline underline-offset-4 focus-visible:outline focus-visible:outline-2"
                href={cardTaskHref}
              >
                Open card tasks
              </Link>
            ) : null}
            <Button type="button" variant="secondary" onClick={onClose}>
              {continueLabel}
            </Button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
