import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  approvalsControllerDecideApprovalV1,
  approvalsControllerListApprovalsV1,
} from '../lib/api/generated-client';
import { ApprovalsPanel } from '../components/workflows/approvals-panel';

jest.mock('../lib/api/generated-client', () => ({
  approvalsControllerDecideApprovalV1: jest.fn(),
  approvalsControllerListApprovalsV1: jest.fn(),
}));

const pendingApproval = {
  id: 'approval-1',
  status: 'PENDING',
  targetType: 'EARN',
  requestedAmountKobo: 250000,
  requestedAt: '2026-09-30T10:00:00.000Z',
  reasonCode: 'PURCHASE_ABOVE_APPROVAL_THRESHOLD',
  customer: { id: 'customer-1', fullName: 'Ada Customer' },
  receipt: { posReceiptNumber: 'POS-12', purchaseAmountKobo: 250000 },
};

function listResponse(
  items = [pendingApproval],
  nextCursor: string | null = null,
) {
  return {
    status: 200,
    data: { data: { items, nextCursor, hasMore: Boolean(nextCursor) } },
  } as never;
}

async function waitForQueueLoad() {
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Refresh approvals' }),
    ).not.toBeDisabled(),
  );
}

describe('ApprovalsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(approvalsControllerListApprovalsV1)
      .mockResolvedValue(listResponse());
  });

  it('shows clean results and opens a decision dialog with preset reasons', async () => {
    jest.mocked(approvalsControllerDecideApprovalV1).mockResolvedValue({
      status: 200,
      data: { data: { id: 'approval-1', status: 'EXECUTED' } },
    } as never);
    render(<ApprovalsPanel />);
    const reviewButton = await screen.findByRole('button', {
      name: /Ada Customer/,
    });
    await waitForQueueLoad();

    expect(
      screen.getByRole('heading', {
        name: 'Transactions awaiting approval',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('1 result')).toBeInTheDocument();
    for (const label of [
      'Transaction',
      'Customer',
      'Type',
      'Amount',
      'Status',
      'Action',
    ]) {
      expect(
        screen.getByRole('columnheader', { name: label }),
      ).toBeInTheDocument();
    }
    expect(screen.queryByText('Awaiting review')).not.toBeInTheDocument();
    expect(screen.queryByText('1 shown')).not.toBeInTheDocument();

    fireEvent.click(reviewButton);
    expect(
      screen.getByRole('dialog', { name: 'Review approval' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Reject' }));
    fireEvent.change(screen.getByLabelText('Decision reason'), {
      target: { value: 'Does not meet approval policy' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit rejection' }));

    await waitFor(() => {
      expect(approvalsControllerDecideApprovalV1).toHaveBeenCalledWith(
        'approval-1',
        { decision: 'REJECTED', reason: 'Does not meet approval policy' },
        expect.objectContaining({ headers: expect.any(Object) }),
      );
    });
  });

  it('sends status filters to the server and paginates without truncating rows', async () => {
    jest
      .mocked(approvalsControllerListApprovalsV1)
      .mockResolvedValueOnce(
        listResponse(
          [pendingApproval, { ...pendingApproval, id: 'approval-2' }],
          'cursor-2',
        ),
      )
      .mockResolvedValueOnce(
        listResponse([{ ...pendingApproval, id: 'approval-3' }]),
      );
    render(<ApprovalsPanel />);
    await screen.findByRole('heading', {
      name: 'Transactions awaiting approval',
    });
    await waitForQueueLoad();
    expect(screen.getByText('2 results')).toBeInTheDocument();
    expect(
      (await screen.findAllByRole('button', { name: /Ada Customer/ })).length,
    ).toBe(2);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => {
      expect(approvalsControllerListApprovalsV1).toHaveBeenLastCalledWith(
        { limit: '10', cursor: 'cursor-2', status: 'PENDING' },
        expect.objectContaining({ headers: expect.any(Object) }),
      );
    });
    await waitForQueueLoad();
  });

  it('keeps the labeled results table visible when there are no approvals', async () => {
    jest
      .mocked(approvalsControllerListApprovalsV1)
      .mockResolvedValue(listResponse([]));
    render(<ApprovalsPanel />);

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Transaction' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        'No approvals found. Try another status or refresh the list.',
      ),
    ).toBeInTheDocument();
  });

  it('opens decided approvals read-only', async () => {
    jest.mocked(approvalsControllerListApprovalsV1).mockResolvedValue(
      listResponse([
        {
          ...pendingApproval,
          status: 'REJECTED',
          decidedAt: '2026-09-30T11:00:00.000Z',
        },
      ]),
    );
    render(<ApprovalsPanel />);
    fireEvent.change(screen.getByLabelText('Approval status filter'), {
      target: { value: 'REJECTED' },
    });
    await screen.findByRole('heading', { name: 'Rejected transactions' });
    const reviewButton = await screen.findByRole('button', {
      name: /Ada Customer/,
    });
    await waitForQueueLoad();
    fireEvent.click(reviewButton);

    expect(
      screen.getByRole('dialog', { name: 'Approval details' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Decision already recorded')).toBeInTheDocument();
    expect(
      screen.queryByRole('radio', { name: 'Approve' }),
    ).not.toBeInTheDocument();
  });
});
