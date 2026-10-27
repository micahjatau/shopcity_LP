import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminAdjustmentsPage from '../app/(shell)/admin/adjustments/page';
import AdminPoliciesPage from '../app/(shell)/admin/policies/page';
import {
  adjustmentsControllerCreateV1,
  branchesControllerListBranchesV1,
  configurationControllerGetPolicyConfigurationV1,
  configurationControllerUpdatePolicyConfigurationV1,
  customersControllerGetCustomerV1,
} from '../lib/api/generated-client';

jest.mock('../lib/adjustment-operation', () => {
  const actual = jest.requireActual('../lib/adjustment-operation');
  let sequence = 0;
  const digest = async (value: string) => {
    let hash = 2166136261;
    for (const character of value)
      hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
    return (hash >>> 0).toString(16).padStart(64, '0');
  };
  return {
    ...actual,
    getAdjustmentOperationIdentity: (payload: unknown) =>
      actual.getAdjustmentOperationIdentity(payload, {
        digest,
        createId: () =>
          `00000000-0000-4000-8000-${(++sequence).toString().padStart(12, '0')}`,
      }),
    clearAdjustmentOperationIdentity: (payload: unknown, identity: unknown) =>
      actual.clearAdjustmentOperationIdentity(payload, identity, { digest }),
  };
});

jest.mock('../lib/api/generated-client', () => ({
  adjustmentsControllerCreateV1: jest.fn(),
  branchesControllerListBranchesV1: jest.fn(),
  configurationControllerGetPolicyConfigurationV1: jest.fn(),
  configurationControllerUpdatePolicyConfigurationV1: jest.fn(),
  customersControllerGetCustomerV1: jest.fn(),
}));

const policy = {
  branchId: 'branch-1',
  branchName: 'Main',
  version: 3,
  defaultEarnRateBps: 200,
  minRedemptionKobo: 1000,
  maxRedemptionBasketPercent: 25,
  purchaseFlagThresholdKobo: 50000,
  purchaseApprovalThresholdKobo: 100000,
  purchaseAmountCeilingKobo: 500000,
  redemptionApprovalThresholdKobo: 200000,
  offlineRedemptionDisabled: false,
};

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  window.sessionStorage.clear();
});

describe('admin financial unit boundaries', () => {
  it('accepts a naira amount and submits an integer-kobo adjustment', async () => {
    const user = userEvent.setup();
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: { data: { fullName: 'Ada Customer', balanceKobo: 10000 } },
    } as never);
    jest.mocked(adjustmentsControllerCreateV1).mockResolvedValue({
      status: 201,
      data: { data: { id: 'adjustment-1' } },
    } as never);

    render(<AdminAdjustmentsPage />);
    await user.type(
      screen.getByRole('textbox', { name: 'Customer ID' }),
      'customer-1',
    );
    const amount = screen.getByRole('textbox', { name: 'Amount' });
    await user.type(amount, '123.45');
    expect(amount).toHaveValue('123.45');
    await user.tab();
    expect(screen.getAllByText('₦123.45')).toHaveLength(2);
    await user.type(
      screen.getByRole('textbox', { name: 'Reason' }),
      'Correction',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Confirmation' }),
      'SUBMIT',
    );
    await user.click(screen.getByRole('button', { name: 'Submit adjustment' }));

    await waitFor(() =>
      expect(adjustmentsControllerCreateV1).toHaveBeenCalled(),
    );
    expect(adjustmentsControllerCreateV1).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'customer-1',
        amountKobo: 12345,
        kind: 'CREDIT',
      }),
      expect.anything(),
    );
    expect(screen.getByText('Adjustment created.')).toBeInTheDocument();
  });

  it('reuses adjustment identity after an ambiguous request and refreshes it after success', async () => {
    const user = userEvent.setup();
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: { data: { fullName: 'Ada Customer', balanceKobo: 10000 } },
    } as never);
    jest
      .mocked(adjustmentsControllerCreateV1)
      .mockRejectedValueOnce(new Error('Transport lost response'))
      .mockResolvedValue({
        status: 201,
        data: { data: { id: 'adjustment-1' } },
      } as never);

    render(<AdminAdjustmentsPage />);
    await user.type(
      screen.getByRole('textbox', { name: 'Customer ID' }),
      'customer-1',
    );
    await user.type(screen.getByRole('textbox', { name: 'Amount' }), '123.45');
    await user.type(
      screen.getByRole('textbox', { name: 'Reason' }),
      'Correction',
    );
    const confirmation = screen.getByRole('textbox', { name: 'Confirmation' });
    await user.type(confirmation, 'SUBMIT');
    const submit = screen.getByRole('button', { name: 'Submit adjustment' });

    await user.click(submit);
    await waitFor(() =>
      expect(
        screen.getByText(
          'Adjustment outcome is uncertain. Retry the unchanged draft to avoid creating a second adjustment.',
        ),
      ).toBeInTheDocument(),
    );
    await user.click(submit);

    await waitFor(() =>
      expect(screen.getByText('Adjustment created.')).toBeInTheDocument(),
    );
    expect(adjustmentsControllerCreateV1).toHaveBeenCalledTimes(2);
    const [firstBody, firstOptions] = jest.mocked(adjustmentsControllerCreateV1)
      .mock.calls[0];
    const [retryBody, retryOptions] = jest.mocked(adjustmentsControllerCreateV1)
      .mock.calls[1];
    expect(retryBody).toEqual(firstBody);
    expect(retryBody.effectiveAt).toBe(firstBody.effectiveAt);
    expect(retryOptions).toEqual(
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(retryOptions.headers).toEqual(firstOptions.headers);
    const firstKey = (firstOptions.headers as Record<string, string>)[
      'idempotency-key'
    ];
    const retryKey = (retryOptions.headers as Record<string, string>)[
      'idempotency-key'
    ];
    expect(retryKey).toBe(firstKey);

    await user.type(confirmation, 'SUBMIT');
    await user.click(submit);
    await waitFor(() =>
      expect(adjustmentsControllerCreateV1).toHaveBeenCalledTimes(3),
    );
    const [newBody, newOptions] = jest.mocked(adjustmentsControllerCreateV1)
      .mock.calls[2];
    expect(newBody).toEqual({
      ...firstBody,
      effectiveAt: newBody.effectiveAt,
    });
    expect(
      (newOptions.headers as Record<string, string>)['idempotency-key'],
    ).not.toBe(firstKey);
    expect(newBody.effectiveAt).not.toBe(firstBody.effectiveAt);
  });

  it('refuses submission and directs the operator to verify an outcome when session storage is unavailable', async () => {
    const user = userEvent.setup();
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: { data: { fullName: 'Ada Customer', balanceKobo: 10000 } },
    } as never);
    const sessionStorageDescriptor = Object.getOwnPropertyDescriptor(
      window,
      'sessionStorage',
    );
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: () =>
          JSON.stringify([
            {
              payloadDigest: 'not-a-digest',
              idempotencyKey: '00000000-0000-4000-8000-000000000001',
              effectiveAt: '2026-10-17T10:00:00.000Z',
              createdAt: '2026-10-17T10:00:00.000Z',
            },
          ]),
        setItem: () => undefined,
      },
    });
    render(<AdminAdjustmentsPage />);
    await user.type(
      screen.getByRole('textbox', { name: 'Customer ID' }),
      'customer-1',
    );
    await user.type(screen.getByRole('textbox', { name: 'Amount' }), '123.45');
    await user.type(
      screen.getByRole('textbox', { name: 'Reason' }),
      'Correction',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Confirmation' }),
      'SUBMIT',
    );
    await user.click(screen.getByRole('button', { name: 'Submit adjustment' }));

    await waitFor(() =>
      expect(
        screen.getByText(/do not submit a new adjustment/i),
      ).toBeInTheDocument(),
    );
    expect(adjustmentsControllerCreateV1).not.toHaveBeenCalled();
    if (sessionStorageDescriptor) {
      Object.defineProperty(window, 'sessionStorage', sessionStorageDescriptor);
    }
  });

  it('reuses the unresolved identity after unmounting and re-entering the same draft', async () => {
    const user = userEvent.setup();
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: { data: { fullName: 'Ada Customer', balanceKobo: 10000 } },
    } as never);
    jest
      .mocked(adjustmentsControllerCreateV1)
      .mockRejectedValueOnce(new Error('Transport lost response'))
      .mockResolvedValue({
        status: 201,
        data: { data: { id: 'adjustment-1' } },
      } as never);

    const enterDraft = async () => {
      render(<AdminAdjustmentsPage />);
      await user.type(
        screen.getByRole('textbox', { name: 'Customer ID' }),
        'customer-1',
      );
      await user.type(
        screen.getByRole('textbox', { name: 'Amount' }),
        '123.45',
      );
      await user.type(
        screen.getByRole('textbox', { name: 'Reason' }),
        'Correction',
      );
      await user.type(
        screen.getByRole('textbox', { name: 'Confirmation' }),
        'SUBMIT',
      );
    };
    const first = render(<AdminAdjustmentsPage />);
    await user.type(
      screen.getByRole('textbox', { name: 'Customer ID' }),
      'customer-1',
    );
    await user.type(screen.getByRole('textbox', { name: 'Amount' }), '123.45');
    await user.type(
      screen.getByRole('textbox', { name: 'Reason' }),
      'Correction',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Confirmation' }),
      'SUBMIT',
    );
    await user.click(screen.getByRole('button', { name: 'Submit adjustment' }));
    await waitFor(() =>
      expect(adjustmentsControllerCreateV1).toHaveBeenCalledTimes(1),
    );
    first.unmount();

    await enterDraft();
    await user.click(screen.getByRole('button', { name: 'Submit adjustment' }));
    await waitFor(() =>
      expect(adjustmentsControllerCreateV1).toHaveBeenCalledTimes(2),
    );
    const calls = jest.mocked(adjustmentsControllerCreateV1).mock.calls;
    expect(calls[1][0]).toEqual(calls[0][0]);
    expect(calls[1][1].headers).toEqual(calls[0][1].headers);
    expect(await screen.findByText('Adjustment created.')).toBeInTheDocument();
  });

  it('ignores a second submit while the first adjustment request is pending', async () => {
    const user = userEvent.setup();
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: { data: { fullName: 'Ada Customer', balanceKobo: 10000 } },
    } as never);
    let resolveRequest!: (value: unknown) => void;
    jest.mocked(adjustmentsControllerCreateV1).mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }) as never,
    );

    render(<AdminAdjustmentsPage />);
    await user.type(
      screen.getByRole('textbox', { name: 'Customer ID' }),
      'customer-1',
    );
    await user.type(screen.getByRole('textbox', { name: 'Amount' }), '123.45');
    await user.type(
      screen.getByRole('textbox', { name: 'Reason' }),
      'Correction',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Confirmation' }),
      'SUBMIT',
    );
    const submit = screen.getByRole('button', { name: 'Submit adjustment' });

    await user.dblClick(submit);
    expect(adjustmentsControllerCreateV1).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Submitting adjustment…')).toBeInTheDocument();

    resolveRequest({
      status: 201,
      data: { data: { id: 'adjustment-1' } },
    });
    await waitFor(() =>
      expect(screen.getByText('Adjustment created.')).toBeInTheDocument(),
    );
    expect(
      screen.queryByText('Submitting adjustment…'),
    ).not.toBeInTheDocument();
  });

  it('reuses a prior identity when a changed draft is reverted', async () => {
    const user = userEvent.setup();
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: { data: { fullName: 'Ada Customer', balanceKobo: 10000 } },
    } as never);
    jest.mocked(adjustmentsControllerCreateV1).mockResolvedValue({
      status: 409,
      data: { message: 'Conflict' },
    } as never);

    render(<AdminAdjustmentsPage />);
    await user.type(
      screen.getByRole('textbox', { name: 'Customer ID' }),
      'customer-1',
    );
    const amount = screen.getByRole('textbox', { name: 'Amount' });
    await user.type(amount, '123.45');
    await user.type(
      screen.getByRole('textbox', { name: 'Reason' }),
      'Correction',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Confirmation' }),
      'SUBMIT',
    );
    const submit = screen.getByRole('button', { name: 'Submit adjustment' });

    await user.click(submit);
    await waitFor(() =>
      expect(adjustmentsControllerCreateV1).toHaveBeenCalledTimes(1),
    );
    await user.clear(amount);
    await user.type(amount, '124.45');
    await user.click(submit);
    await waitFor(() =>
      expect(adjustmentsControllerCreateV1).toHaveBeenCalledTimes(2),
    );
    await user.clear(amount);
    await user.type(amount, '123.45');
    await user.click(submit);
    await waitFor(() =>
      expect(adjustmentsControllerCreateV1).toHaveBeenCalledTimes(3),
    );

    const calls = jest.mocked(adjustmentsControllerCreateV1).mock.calls;
    const keys = calls.map(
      ([, options]) =>
        (options.headers as Record<string, string>)['idempotency-key'],
    );
    expect(keys[1]).not.toBe(keys[0]);
    expect(keys[2]).toBe(keys[0]);
    expect(calls[0][0].amountKobo).toBe(12345);
    expect(calls[1][0].amountKobo).toBe(12445);
    expect(calls[2][0].amountKobo).toBe(12345);
  });

  it('displays policy naira/percent values and saves integer kobo/BPS after ordinary edits', async () => {
    const user = userEvent.setup();
    jest.mocked(branchesControllerListBranchesV1).mockResolvedValue({
      status: 200,
      data: { data: [{ id: 'branch-1', name: 'Main', status: 'ACTIVE' }] },
    } as never);
    jest
      .mocked(configurationControllerGetPolicyConfigurationV1)
      .mockResolvedValue({
        status: 200,
        data: { data: policy },
      } as never);
    jest
      .mocked(configurationControllerUpdatePolicyConfigurationV1)
      .mockResolvedValue({
        status: 200,
        data: {
          data: {
            ...policy,
            defaultEarnRateBps: 250,
            minRedemptionKobo: 123456,
          },
        },
      } as never);

    render(<AdminPoliciesPage />);
    const earnRate = await screen.findByRole('textbox', {
      name: 'Default earn rate (%)',
    });
    const minimum = screen.getByRole('textbox', {
      name: 'Minimum redemption (₦)',
    });
    expect(earnRate).toHaveValue('2.00');
    expect(minimum).toHaveValue('10.00');

    await user.clear(earnRate);
    await user.type(earnRate, '2.50');
    await user.clear(minimum);
    await user.type(minimum, '1,234.56');
    expect(earnRate).toHaveValue('2.50');
    expect(minimum).toHaveValue('1,234.56');
    await user.click(screen.getByRole('button', { name: 'Save policy' }));

    await waitFor(() =>
      expect(
        configurationControllerUpdatePolicyConfigurationV1,
      ).toHaveBeenCalled(),
    );
    const [payload] = jest.mocked(
      configurationControllerUpdatePolicyConfigurationV1,
    ).mock.calls[0];
    expect(payload).toEqual(
      expect.objectContaining({
        defaultEarnRateBps: 250,
        minRedemptionKobo: 123456,
        maxRedemptionBasketPercent: 25,
        purchaseFlagThresholdKobo: 50000,
        expectedVersion: 3,
      }),
    );
    expect(payload.defaultEarnRateBps).not.toBe(2.5);
    expect(payload.minRedemptionKobo).not.toBe(1234.56);
    expect(screen.getByText('Policy saved and audited.')).toBeInTheDocument();
  });
});
