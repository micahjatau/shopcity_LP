'use client';

import { useEffect, useRef, useState } from 'react';
import {
  customersControllerGetMarketingPreferenceV1,
  customersControllerWithdrawMarketingPreferenceV1,
  type CustomersControllerGetMarketingPreferenceV1200DataStatus,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import { Button, Checkbox, Dialog } from '../../components/ui';

type PreferenceStatus =
  CustomersControllerGetMarketingPreferenceV1200DataStatus;

const preferenceLabels: Record<PreferenceStatus, string> = {
  OPTED_IN: 'Opted in',
  OPTED_OUT: 'Opted out',
  NOT_OPTED_IN: 'Not opted in',
  UNAVAILABLE: 'Unavailable',
};

export function CashierMarketingWithdrawal({
  customerId,
}: Readonly<{ customerId: string }>) {
  const [preferenceStatus, setPreferenceStatus] =
    useState<PreferenceStatus>('UNAVAILABLE');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [preferenceLoading, setPreferenceLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmedInPerson, setConfirmedInPerson] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const idempotencyKey = useRef<{ customerId: string; key: string } | null>(
    null,
  );
  const activeCustomerId = useRef(customerId);
  activeCustomerId.current = customerId;

  useEffect(() => {
    let active = true;
    idempotencyKey.current = null;
    setDialogOpen(false);
    setConfirmedInPerson(false);
    setBusy(false);
    setErrorMessage('');
    setPreferenceLoading(true);
    setPreferenceStatus('UNAVAILABLE');
    setUpdatedAt(null);
    setStatusMessage('');

    void customersControllerGetMarketingPreferenceV1(
      customerId,
      createApiRequest({ csrf: true }),
    )
      .then((response) => {
        if (!active) return;
        if (response.status !== 200) {
          setPreferenceStatus('UNAVAILABLE');
          return;
        }
        setPreferenceStatus(response.data.data.status);
        setUpdatedAt(response.data.data.updatedAt);
      })
      .catch(() => {
        if (active) setPreferenceStatus('UNAVAILABLE');
      })
      .finally(() => {
        if (active) setPreferenceLoading(false);
      });

    return () => {
      active = false;
    };
  }, [customerId]);

  const getIdempotencyKey = () => {
    if (idempotencyKey.current?.customerId !== customerId) {
      idempotencyKey.current = { customerId, key: crypto.randomUUID() };
    }
    return idempotencyKey.current.key;
  };

  const openDialog = () => {
    getIdempotencyKey();
    setConfirmedInPerson(false);
    setErrorMessage('');
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (busy) return;
    setDialogOpen(false);
    setConfirmedInPerson(false);
    setErrorMessage('');
  };

  const submitWithdrawal = async () => {
    if (!confirmedInPerson || busy) return;
    const targetCustomerId = customerId;
    const requestKey = getIdempotencyKey();
    setBusy(true);
    setErrorMessage('');
    try {
      const response = await customersControllerWithdrawMarketingPreferenceV1(
        targetCustomerId,
        { confirmedInPersonRequest: true },
        createApiRequest({ csrf: true, idempotencyKey: requestKey }),
      );
      if (activeCustomerId.current !== targetCustomerId) return;
      if (response.status !== 201) {
        setErrorMessage(
          'The request could not be confirmed. Keep this dialog open and retry.',
        );
        return;
      }

      setPreferenceStatus(response.data.data.status);
      setUpdatedAt(response.data.data.updatedAt);
      setStatusMessage(
        response.data.data.alreadyOptedOut
          ? 'ShopCity already marks this customer as opted out of optional marketing. Update any separate marketing list manually if one is used.'
          : 'The customer’s request was recorded in ShopCity. Update any separate marketing list manually if one is used.',
      );
      idempotencyKey.current = null;
      setDialogOpen(false);
      setConfirmedInPerson(false);
    } catch {
      if (activeCustomerId.current === targetCustomerId) {
        setErrorMessage(
          'The request could not be confirmed. Keep this dialog open and retry.',
        );
      }
    } finally {
      if (activeCustomerId.current === targetCustomerId) setBusy(false);
    }
  };

  return (
    <section
      className="cashier-marketing-withdrawal grid gap-2"
      aria-label="Marketing preference"
    >
      <p>
        Optional marketing preference:{' '}
        {preferenceLoading ? 'Loading…' : preferenceLabels[preferenceStatus]}
        {updatedAt
          ? ` · Updated ${new Date(updatedAt).toLocaleDateString()}`
          : ''}
      </p>
      <Button
        type="button"
        variant="secondary"
        onClick={openDialog}
        disabled={preferenceLoading || busy}
      >
        Record marketing opt-out
      </Button>
      {statusMessage ? (
        <p role="status" aria-live="polite">
          {statusMessage}
        </p>
      ) : null}
      <Dialog
        open={dialogOpen}
        title="Record marketing opt-out"
        onClose={closeDialog}
      >
        <div className="sc-dialog__body">
          <p>
            Confirm the selected customer record with them, then record this
            only if the customer asked in person to stop optional ShopCity
            promotional messages. This does not close the customer’s account or
            remove purchase or wallet history. Transactional and service
            messages may continue.
          </p>
          <p>
            This records the preference in ShopCity; it does not sync external
            marketing lists. If a separate list is used, update it manually
            after recording the request.
          </p>
          <label
            htmlFor="cashier-marketing-opt-out-confirmation"
            className="flex items-start gap-2"
          >
            <Checkbox
              id="cashier-marketing-opt-out-confirmation"
              checked={confirmedInPerson}
              onChange={(event) => setConfirmedInPerson(event.target.checked)}
              aria-label="Customer requested marketing opt-out in person"
            />
            I confirm the customer requested this change in person.
          </label>
          {errorMessage ? <p role="alert">{errorMessage}</p> : null}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={closeDialog}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={!confirmedInPerson || busy}
              loading={busy}
              onClick={() => void submitWithdrawal()}
            >
              Record request
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  );
}
