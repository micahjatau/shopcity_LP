'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import {
  customersControllerCreateCustomerV1,
  customersControllerUpdateCustomerV1,
  type CreateCustomerDto,
  type UpdateCustomerDto,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';

export type CustomerRegistrationFormState = {
  fullName: string;
  phone: string;
  email: string;
  cardSerialNumber: string;
  isStaff: boolean;
};

type RegistrationMode = 'create' | 'update';

type CustomerRegistrationControllerProps = {
  form: CustomerRegistrationFormState;
  setForm: Dispatch<SetStateAction<CustomerRegistrationFormState>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  search: () => Promise<void>;
  reloadSelectedCustomer: () => Promise<void>;
};

export function useCustomerRegistrationController({
  form,
  setForm,
  selectedId,
  setSelectedId,
  search,
  reloadSelectedCustomer,
}: CustomerRegistrationControllerProps) {
  const [message, setMessage] = useState(
    'Register a customer or select one to edit their profile.',
  );
  const [busy, setBusy] = useState(false);

  async function saveCustomer(mode: RegistrationMode) {
    const basePayload = {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      ...(form.email.trim() ? { email: form.email.trim() } : {}),
      ...(mode === 'update' ? { isStaff: form.isStaff } : {}),
    };

    if (!basePayload.fullName || !basePayload.phone) {
      setMessage('Full name and phone are required.');
      return;
    }
    if (mode === 'create' && !form.cardSerialNumber.trim()) {
      setMessage('Initial card serial number is required.');
      return;
    }
    if (mode === 'update' && !selectedId) {
      setMessage('Select a customer before editing.');
      return;
    }

    setBusy(true);
    setMessage(
      mode === 'create' ? 'Registering customer…' : 'Saving customer profile…',
    );
    try {
      const response =
        mode === 'create'
          ? await customersControllerCreateCustomerV1(
              {
                ...basePayload,
                cardSerialNumber: form.cardSerialNumber.trim(),
              } satisfies CreateCustomerDto,
              createApiRequest({
                csrf: true,
                idempotencyKey: crypto.randomUUID(),
              }),
            )
          : await customersControllerUpdateCustomerV1(
              selectedId!,
              basePayload satisfies UpdateCustomerDto,
              createApiRequest({
                csrf: true,
                idempotencyKey: crypto.randomUUID(),
              }),
            );
      const successStatus = mode === 'create' ? 201 : 200;
      if (response.status !== successStatus) {
        setMessage(
          `${mode === 'create' ? 'Registration' : 'Profile update'} unavailable (${response.status}).`,
        );
        return;
      }

      const record = response.data.data as { id?: string };
      setMessage(
        mode === 'create' ? 'Customer registered.' : 'Customer profile saved.',
      );
      if (mode === 'create' && record.id) setSelectedId(record.id);
      await search();
      if (mode === 'update') await reloadSelectedCustomer();
    } catch {
      setMessage(
        `${mode === 'create' ? 'Registration' : 'Profile update'} unavailable.`,
      );
    } finally {
      setBusy(false);
    }
  }

  return { busy, message, saveCustomer, setForm, setMessage };
}
