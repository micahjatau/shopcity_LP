import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { SupervisorCardManagement } from '../components/workflows/supervisor-card-management';
import { SupervisorCardWorkflows } from '../components/workflows/supervisor-card-workflows';
import {
  cardsControllerLookupManagementCardV1,
  cardsControllerReplaceCardV1,
  cardsControllerUpdateStatusV1,
} from '../lib/api/generated-client';

let query = new URLSearchParams();
const replaceUrl = jest.fn();
const pushUrl = jest.fn();
jest.mock('next/navigation', () => ({
  useSearchParams: () => query,
  useRouter: () => ({ replace: replaceUrl, push: pushUrl }),
}));
jest.mock('../components/workflows/supervisor-card-assignment', () => ({
  SupervisorCardAssignment: () => <div>Assignment workspace</div>,
}));
jest.mock('../lib/api/generated-client', () => ({
  cardsControllerLookupManagementCardV1: jest.fn(),
  cardsControllerReplaceCardV1: jest.fn(),
  cardsControllerUpdateStatusV1: jest.fn(),
}));

const active = {
  id: 'card-1',
  serialNumber: 'SER-1',
  status: 'ACTIVE',
  issuedAt: '2026-01-01',
  blockedAt: null,
  replacedAt: null,
  customer: { id: 'customer-1', fullName: 'Ada Example', status: 'ACTIVE' },
};
const ok = (card: typeof active) => ({ status: 200, data: { data: card } });

beforeEach(() => {
  jest.clearAllMocks();
  document.cookie = 'shopcity_csrf=test-csrf';
  query = new URLSearchParams();
  jest
    .mocked(cardsControllerLookupManagementCardV1)
    .mockResolvedValue(ok(active) as never);
});

describe('Supervisor card management tabs', () => {
  it('keeps tab controls valid, roving keyboard semantics and only the selected workspace mounted', () => {
    const { rerender } = render(<SupervisorCardWorkflows />);
    const assign = screen.getByRole('tab', { name: 'Assign card' });
    const manage = screen.getByRole('tab', { name: 'Manage cards' });
    const expectValidPanelTargets = () => {
      for (const tab of [assign, manage]) {
        const targetId = tab.getAttribute('aria-controls');
        expect(targetId).toBeTruthy();
        expect(document.getElementById(targetId!)).toBeInTheDocument();
      }
    };
    expectValidPanelTargets();
    expect(assign).toHaveAttribute('aria-selected', 'true');
    expect(assign).toHaveAttribute('tabindex', '0');
    expect(manage).toHaveAttribute('tabindex', '-1');
    expect(document.querySelectorAll('[role="tabpanel"]')).toHaveLength(2);
    expect(document.getElementById('card-panel-assign')).not.toHaveAttribute(
      'hidden',
    );
    expect(document.getElementById('card-panel-manage')).toHaveAttribute(
      'hidden',
    );
    expect(screen.getByText('Assignment workspace')).toBeInTheDocument();
    expect(
      within(screen.getByRole('tabpanel', { name: 'Assign card' })).queryByRole(
        'heading',
        { name: 'Manage cards' },
      ),
    ).not.toBeInTheDocument();
    fireEvent.keyDown(assign, { key: 'ArrowRight' });
    expect(manage).toHaveFocus();
    query = new URLSearchParams('tab=manage');
    rerender(<SupervisorCardWorkflows />);
    expectValidPanelTargets();
    expect(screen.getByRole('tab', { name: 'Manage cards' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(pushUrl).toHaveBeenLastCalledWith('/supervisor/cards?tab=manage', {
      scroll: false,
    });
    expect(document.getElementById('card-panel-assign')).toHaveAttribute(
      'hidden',
    );
    expect(document.getElementById('card-panel-manage')).not.toHaveAttribute(
      'hidden',
    );
    expect(screen.getByRole('tabpanel')).toHaveAttribute(
      'aria-labelledby',
      'card-tab-manage',
    );
    expect(
      within(screen.getByRole('tabpanel', { name: 'Manage cards' })).getByRole(
        'heading',
        { name: 'Manage cards' },
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Assignment workspace')).not.toBeInTheDocument();
    const selectedManage = screen.getByRole('tab', { name: 'Manage cards' });
    fireEvent.keyDown(selectedManage, { key: 'Home' });
    expect(assign).toHaveFocus();
    fireEvent.keyDown(assign, { key: 'End' });
    expect(selectedManage).toHaveFocus();
  });

  it('does not render raw card lookup response data after selection', async () => {
    const privateDebugField = 'CARD_LOOKUP_PRIVATE_DEBUG_7f3a';
    const responseData = {
      ...active,
      debugMetadata: { privateValue: privateDebugField },
    };
    const response = { status: 200, data: { data: responseData } };
    jest
      .mocked(cardsControllerLookupManagementCardV1)
      .mockResolvedValueOnce(response as never)
      .mockResolvedValueOnce(response as never);
    render(<SupervisorCardManagement />);
    fireEvent.change(screen.getByLabelText('Card serial'), {
      target: { value: 'SER-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search card' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select and verify card' }),
    );
    expect(
      await screen.findByRole('button', { name: 'Block card' }),
    ).toBeInTheDocument();

    expect(screen.getByText('Card status')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain(privateDebugField);
    expect(document.body.textContent).not.toContain(JSON.stringify(response));
  });

  it('requires explicit candidate selection and authoritative ID verification before actions', async () => {
    jest
      .mocked(cardsControllerLookupManagementCardV1)
      .mockResolvedValueOnce(ok(active) as never)
      .mockResolvedValueOnce(ok(active) as never);
    render(<SupervisorCardManagement />);
    fireEvent.change(screen.getByLabelText('Card serial'), {
      target: { value: 'SER-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search card' }));
    await screen.findByRole('button', { name: 'Select and verify card' });
    expect(
      screen.queryByRole('button', { name: 'Block card' }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Select and verify card' }),
    );
    expect(
      await screen.findByRole('button', { name: 'Block card' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Card status')).toBeInTheDocument();
    expect(screen.getByText('Customer status')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(
      /Detail-led|Route-backed|Contract-driven|implementation note|route context|ledger history|earn ledger/i,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(cardsControllerLookupManagementCardV1).toHaveBeenCalledTimes(2);
  });

  it.each(['ACTIVE', 'BLOCKED', 'REPLACED'] as const)(
    'renders a live ShopCity card preview for %s status after explicit verification',
    async (status) => {
      const record = { ...active, status };
      jest
        .mocked(cardsControllerLookupManagementCardV1)
        .mockResolvedValue(ok(record) as never);
      render(<SupervisorCardManagement />);
      expect(
        screen.queryByRole('img', { name: /ShopCity card preview/ }),
      ).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Card serial'), {
        target: { value: 'SER-1' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Search card' }));
      fireEvent.click(
        await screen.findByRole('button', { name: 'Select and verify card' }),
      );

      const preview = await screen.findByRole('img', {
        name: `ShopCity card preview for Ada Example; serial SER-1; status ${status}`,
      });
      expect(preview).toHaveTextContent('SER-1');
      expect(preview).toHaveTextContent('Ada Example');
      expect(preview).toHaveTextContent(status);
      expect(preview).not.toHaveTextContent('SC-2670-7376');
    },
  );

  it('blocks only after explicit confirmation, sends CSRF/idempotency request and refreshes authority', async () => {
    jest
      .mocked(cardsControllerUpdateStatusV1)
      .mockResolvedValue({ status: 200 } as never);
    jest
      .mocked(cardsControllerLookupManagementCardV1)
      .mockResolvedValueOnce(ok(active) as never)
      .mockResolvedValueOnce(ok(active) as never)
      .mockResolvedValueOnce(ok({ ...active, status: 'BLOCKED' }) as never);
    render(<SupervisorCardManagement />);
    fireEvent.change(screen.getByLabelText('Card serial'), {
      target: { value: 'SER-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search card' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select and verify card' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Block card' }));
    fireEvent.change(screen.getByLabelText('Type BLOCK to confirm'), {
      target: { value: 'BLOCK' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm block' }));
    await waitFor(() =>
      expect(cardsControllerUpdateStatusV1).toHaveBeenCalledTimes(1),
    );
    const [id, body, options] = jest.mocked(cardsControllerUpdateStatusV1).mock
      .calls[0];
    expect(id).toBe('card-1');
    expect(body).toEqual({ status: 'BLOCKED' });
    expect(new Headers(options?.headers).get('x-csrf-token')).toBeTruthy();
    expect(new Headers(options?.headers).get('Idempotency-Key')).toBeTruthy();
    expect(cardsControllerLookupManagementCardV1).toHaveBeenCalledTimes(3);
    expect(
      await screen.findByRole('img', {
        name: /ShopCity card preview for Ada Example; serial SER-1; status BLOCKED/,
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        'Card status updated and current details refreshed.',
      ),
    ).toBeInTheDocument();
  });

  it('does not report success or retain actions when refreshed status differs from the requested status', async () => {
    jest
      .mocked(cardsControllerUpdateStatusV1)
      .mockResolvedValue({ status: 200 } as never);
    jest
      .mocked(cardsControllerLookupManagementCardV1)
      .mockResolvedValueOnce(ok(active) as never)
      .mockResolvedValueOnce(ok(active) as never)
      .mockResolvedValueOnce(ok(active) as never);
    render(<SupervisorCardManagement />);
    fireEvent.change(screen.getByLabelText('Card serial'), {
      target: { value: 'SER-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search card' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select and verify card' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Block card' }));
    fireEvent.change(screen.getByLabelText('Type BLOCK to confirm'), {
      target: { value: 'BLOCK' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm block' }));

    expect(
      await screen.findByText(/status request could not be verified/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/refresh the card lookup and reconcile its status/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/status updated/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Block card' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Reactivate card' }),
    ).not.toBeInTheDocument();
  });

  it('offers replacement only for active customer, starts with blank serial and never displays balance controls', async () => {
    render(<SupervisorCardManagement />);
    fireEvent.change(screen.getByLabelText('Card serial'), {
      target: { value: 'SER-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search card' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select and verify card' }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Replace card' }),
    );
    expect(screen.getByLabelText('New replacement serial')).toHaveValue('');
    expect(screen.queryByText(/balance|transfer/i)).not.toBeInTheDocument();
    expect(cardsControllerReplaceCardV1).not.toHaveBeenCalled();
  });

  it('keeps the serial and fails closed on no-match and lookup errors', async () => {
    jest
      .mocked(cardsControllerLookupManagementCardV1)
      .mockResolvedValueOnce({ status: 404 } as never);
    const { rerender } = render(<SupervisorCardManagement />);
    fireEvent.change(screen.getByLabelText('Card serial'), {
      target: { value: 'MISSING' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search card' }));
    expect(await screen.findByText(/no matching card/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Card serial')).toHaveValue('MISSING');
    expect(
      screen.queryByRole('button', { name: 'Select and verify card' }),
    ).not.toBeInTheDocument();
    jest
      .mocked(cardsControllerLookupManagementCardV1)
      .mockRejectedValueOnce(new Error('offline'));
    rerender(<SupervisorCardManagement />);
    fireEvent.click(screen.getByRole('button', { name: 'Search card' }));
    expect(await screen.findByText(/lookup failed/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Card serial')).toHaveValue('MISSING');
  });

  it('verifies replacement ID and same customer without any balance operation', async () => {
    jest.mocked(cardsControllerReplaceCardV1).mockResolvedValue({
      status: 201,
      data: { data: { id: 'card-2' } },
    } as never);
    jest
      .mocked(cardsControllerLookupManagementCardV1)
      .mockResolvedValueOnce(ok(active) as never)
      .mockResolvedValueOnce(ok(active) as never)
      .mockResolvedValueOnce(ok({ ...active, status: 'REPLACED' }) as never)
      .mockResolvedValueOnce(
        ok({ ...active, id: 'card-2', serialNumber: 'SER-2' }) as never,
      );
    render(<SupervisorCardManagement />);
    fireEvent.change(screen.getByLabelText('Card serial'), {
      target: { value: 'SER-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search card' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select and verify card' }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Replace card' }),
    );
    fireEvent.change(screen.getByLabelText('New replacement serial'), {
      target: { value: 'SER-2' },
    });
    fireEvent.change(screen.getByLabelText('Type REPLACE to confirm'), {
      target: { value: 'REPLACE' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm replacement' }),
    );
    await waitFor(() =>
      expect(cardsControllerReplaceCardV1).toHaveBeenCalledTimes(1),
    );
    expect(cardsControllerReplaceCardV1).toHaveBeenCalledWith(
      'card-1',
      { serialNumber: 'SER-2' },
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(
      await screen.findByRole('img', {
        name: /ShopCity card preview for Ada Example; serial SER-2; status ACTIVE/,
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Replacement verified for the same customer.'),
    ).toBeInTheDocument();
    expect(cardsControllerUpdateStatusV1).not.toHaveBeenCalled();
  });

  it('prevents duplicate replacement submission and safely retries an uncertain response with the same key', async () => {
    jest
      .mocked(cardsControllerReplaceCardV1)
      .mockResolvedValueOnce({ status: 503 } as never)
      .mockResolvedValueOnce({
        status: 201,
        data: { data: { id: 'card-2' } },
      } as never);
    jest
      .mocked(cardsControllerLookupManagementCardV1)
      .mockResolvedValueOnce(ok(active) as never)
      .mockResolvedValueOnce(ok(active) as never)
      .mockResolvedValueOnce(ok({ ...active, status: 'REPLACED' }) as never)
      .mockResolvedValueOnce(
        ok({ ...active, id: 'card-2', serialNumber: 'SER-2' }) as never,
      );
    render(<SupervisorCardManagement />);
    fireEvent.change(screen.getByLabelText('Card serial'), {
      target: { value: 'SER-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search card' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select and verify card' }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Replace card' }),
    );
    fireEvent.change(screen.getByLabelText('New replacement serial'), {
      target: { value: 'SER-2' },
    });
    fireEvent.change(screen.getByLabelText('Type REPLACE to confirm'), {
      target: { value: 'REPLACE' },
    });
    const submit = screen.getByRole('button', { name: 'Confirm replacement' });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(cardsControllerReplaceCardV1).toHaveBeenCalledTimes(1);
    expect(submit).toBeDisabled();
    expect(
      await screen.findByText(
        'The request was not confirmed (503). Review current details before retrying.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Replacement verified for the same customer.'),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('New replacement serial')).toHaveValue(
      'SER-2',
    );
    const firstKey = new Headers(
      jest.mocked(cardsControllerReplaceCardV1).mock.calls[0][2]?.headers,
    ).get('Idempotency-Key');
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm replacement' }),
    );
    await waitFor(() =>
      expect(cardsControllerReplaceCardV1).toHaveBeenCalledTimes(2),
    );
    const retryKey = new Headers(
      jest.mocked(cardsControllerReplaceCardV1).mock.calls[1][2]?.headers,
    ).get('Idempotency-Key');
    expect(retryKey).toBe(firstKey);
    expect(
      await screen.findByText('Replacement verified for the same customer.'),
    ).toBeInTheDocument();
  });

  it('offers only reactivation for blocked cards and no writes for inactive customers', async () => {
    jest
      .mocked(cardsControllerLookupManagementCardV1)
      .mockResolvedValue(ok({ ...active, status: 'BLOCKED' }) as never);
    const { rerender } = render(<SupervisorCardManagement />);
    fireEvent.change(screen.getByLabelText('Card serial'), {
      target: { value: 'SER-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search card' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select and verify card' }),
    );
    expect(
      await screen.findByRole('button', { name: 'Reactivate card' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Replace card' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Block card' }),
    ).not.toBeInTheDocument();

    jest.mocked(cardsControllerLookupManagementCardV1).mockResolvedValue(
      ok({
        ...active,
        customer: { ...active.customer, status: 'INACTIVE' },
      }) as never,
    );
    rerender(<SupervisorCardManagement />);
    fireEvent.change(screen.getByLabelText('Card serial'), {
      target: { value: 'SER-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search card' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select and verify card' }),
    );
    expect(
      await screen.findByText(/customer is not active/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Block card' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Replace card' }),
    ).not.toBeInTheDocument();
  });

  it('fails closed on changed identity and replaced cards', async () => {
    jest
      .mocked(cardsControllerLookupManagementCardV1)
      .mockResolvedValueOnce(ok(active) as never)
      .mockResolvedValueOnce(ok({ ...active, id: 'different-id' }) as never);
    const { rerender } = render(<SupervisorCardManagement />);
    fireEvent.change(screen.getByLabelText('Card serial'), {
      target: { value: 'SER-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search card' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select and verify card' }),
    );
    expect(
      await screen.findByText(/changed or are unavailable/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Block card' }),
    ).not.toBeInTheDocument();

    jest
      .mocked(cardsControllerLookupManagementCardV1)
      .mockResolvedValue(ok({ ...active, status: 'REPLACED' }) as never);
    rerender(<SupervisorCardManagement />);
    fireEvent.change(screen.getByLabelText('Card serial'), {
      target: { value: 'SER-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search card' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select and verify card' }),
    );
    expect(await screen.findByText(/read-only/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Block card' }),
    ).not.toBeInTheDocument();
  });
});
