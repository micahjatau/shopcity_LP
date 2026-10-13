import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  fraudControllerDecideFraudFlagV1,
  fraudControllerListFraudFlagsV1,
} from '../lib/api/generated-client';
import { FraudFlagsPanel } from '../components/workflows/fraud-flags-panel';

jest.mock('../lib/api/generated-client', () => ({
  FraudFlagDecisionDtoDecision: {
    ACKNOWLEDGED: 'ACKNOWLEDGED',
    RESOLVED: 'RESOLVED',
  },
  fraudControllerDecideFraudFlagV1: jest.fn(),
  fraudControllerListFraudFlagsV1: jest.fn(),
}));

const fraudFlag = {
  id: 'fraud-1',
  ruleCode: 'HIGH_VALUE',
  status: 'OPEN',
  severity: 'HIGH',
  branchId: 'branch-1',
  amountKobo: 125000,
  customer: { fullName: 'Amina Bello' },
};

function listResponse(items = [fraudFlag]) {
  return {
    status: 200,
    data: {
      data: {
        items,
        summary: {
          needReviewCount: 12,
          highPriorityCount: 4,
          underReviewCount: 6,
        },
      },
    },
  } as never;
}

describe('FraudFlagsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(fraudControllerListFraudFlagsV1)
      .mockResolvedValue(listResponse());
  });

  it('renders fraud results with labeled columns and plain statuses', async () => {
    render(<FraudFlagsPanel />);

    const results = screen.getByRole('region', { name: 'Fraud flag list' });
    expect(
      await within(results).findByRole('row', {
        name: /HIGH_VALUE Amina Bello/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('1 result')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh fraud flags' }),
    ).toHaveTextContent('Refresh fraud flags');
    for (const label of [
      'Rule',
      'Subject',
      'Severity',
      'Status',
      'Branch',
      'Amount',
      'Action',
    ]) {
      expect(
        screen.getByRole('columnheader', { name: label }),
      ).toBeInTheDocument();
    }
    const firstRow = within(results).getByRole('row', {
      name: /HIGH_VALUE Amina Bello/,
    });
    expect(firstRow.querySelector('[data-label="Rule"]')).toHaveTextContent(
      'HIGH_VALUE',
    );
    expect(firstRow.querySelector('[data-label="Subject"]')).toHaveTextContent(
      'Amina Bello',
    );
    expect(
      within(results).getByRole('cell', { name: 'OPEN' }),
    ).toBeInTheDocument();
    expect(
      within(results).getByRole('cell', { name: 'HIGH' }),
    ).toBeInTheDocument();
    const reviewButton = screen.getByRole('button', {
      name: 'Review case: HIGH_VALUE for Amina Bello',
    });
    expect(reviewButton).toHaveTextContent('Review case');
    expect(reviewButton).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Submit decision' }),
    ).not.toBeInTheDocument();
  });

  it('keeps table labels visible when filters return no records', async () => {
    jest
      .mocked(fraudControllerListFraudFlagsV1)
      .mockResolvedValue(listResponse([]));
    render(<FraudFlagsPanel />);

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Rule' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('No fraud flags match the current filters.'),
    ).toBeInTheDocument();
  });

  it('filters records by severity without hiding the results table', async () => {
    render(<FraudFlagsPanel />);
    await within(
      screen.getByRole('region', { name: 'Fraud flag list' }),
    ).findByRole('row', { name: /HIGH_VALUE Amina Bello/ });

    fireEvent.change(screen.getByLabelText('Fraud severity filter'), {
      target: { value: 'LOW' },
    });

    expect(screen.getByText('0 results')).toBeInTheDocument();
    expect(
      screen.getByText('No fraud flags match the current filters.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('filters by valid status and branch controls', async () => {
    const secondFlag = {
      ...fraudFlag,
      id: 'fraud-2',
      ruleCode: 'LOW_VALUE',
      status: 'RESOLVED',
      severity: 'LOW',
      branchId: 'branch-2',
      customer: { fullName: 'Bola Ade' },
    };
    jest
      .mocked(fraudControllerListFraudFlagsV1)
      .mockResolvedValue(listResponse([fraudFlag, secondFlag]));
    render(<FraudFlagsPanel />);

    await within(
      screen.getByRole('region', { name: 'Fraud flag list' }),
    ).findByRole('row', { name: /HIGH_VALUE Amina Bello/ });
    expect(screen.getByLabelText('Fraud status filter').tagName).toBe('SELECT');
    expect(screen.getByLabelText('Fraud severity filter').tagName).toBe(
      'SELECT',
    );

    fireEvent.change(screen.getByLabelText('Fraud status filter'), {
      target: { value: 'ACKNOWLEDGED' },
    });
    expect(screen.getByText('0 results')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Fraud status filter'), {
      target: { value: 'ALL' },
    });
    fireEvent.change(screen.getByLabelText('Fraud branch filter'), {
      target: { value: 'branch-2' },
    });
    expect(screen.getByText('1 result')).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Fraud flag list' })).getByRole(
        'row',
        { name: /LOW_VALUE Bola Ade/ },
      ),
    ).toBeInTheDocument();
  });

  it('presents Supervisor flags as neutral activity with branch-scoped summaries', async () => {
    const supervisorFlag = {
      ...fraudFlag,
      id: 'case-12345678-private-id',
      ruleCode: 'FR-HV-001',
      branchName: 'Wuse',
      customerName: 'Amina Bello',
      cashierName: 'jane.a',
      receiptNumber: 'POS-1042',
      evidence: {
        purchaseAmountKobo: '125000',
        thresholdKobo: 100000,
        occurredAt: '2026-10-13T10:00:00.000Z',
      },
    };
    jest
      .mocked(fraudControllerListFraudFlagsV1)
      .mockResolvedValue(listResponse([supervisorFlag]));
    render(<FraudFlagsPanel presentation="supervisor" />);

    const results = screen.getByRole('region', {
      name: 'Flagged activity results',
    });
    const row = await within(results).findByRole('row', {
      name: /Purchase above the review threshold/,
    });
    expect(row).toBeInTheDocument();
    expect(row).toHaveTextContent('Customer Amina Bello');
    expect(row).toHaveTextContent('Cashier Jane A');
    expect(row).toHaveTextContent('Receipt POS-1042');
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(
      screen.getByText(/This rule added a review flag/),
    ).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh flagged activity' }),
    ).toHaveTextContent('Refresh');
    expect(
      screen.getByRole('button', {
        name: 'Review case: Purchase above the review threshold for Customer Amina Bello · Cashier Jane A · Receipt POS-1042',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('case-12345678-private-id'),
    ).not.toBeInTheDocument();

    const statusTrigger = screen.getByRole('button', {
      name: 'Review status: All statuses',
    });
    expect(statusTrigger).toHaveTextContent('Review status');
    fireEvent.keyDown(statusTrigger, { key: 'ArrowDown' });
    const statusMenu = screen.getByRole('listbox', { name: 'Review status' });
    const allStatuses = within(statusMenu).getByRole('option', {
      name: 'All statuses',
    });
    const needsReview = within(statusMenu).getByRole('option', {
      name: 'Needs review',
    });
    await waitFor(() => expect(allStatuses).toHaveFocus());
    fireEvent.keyDown(allStatuses, { key: 'ArrowDown' });
    await waitFor(() => expect(needsReview).toHaveFocus());
    fireEvent.keyDown(needsReview, { key: 'Escape' });
    expect(statusTrigger).toHaveFocus();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    const branchTrigger = screen.getByRole('button', {
      name: 'Branch: All branches',
    });
    fireEvent.click(branchTrigger);
    expect(screen.getByRole('option', { name: 'Wuse' })).toBeInTheDocument();
    expect(screen.queryByText('branch-1')).not.toBeInTheDocument();
  });

  it('shows allowlisted context and hides technical identifiers until requested', async () => {
    const supervisorFlag = {
      ...fraudFlag,
      id: 'case-12345678-private-id',
      ruleCode: 'FR-HV-003',
      branchName: 'Wuse',
      customerName: 'Amina Bello',
      cashierName: 'jane.a',
      amountKobo: 750000,
      evidence: { requestedAmountKobo: '750000', thresholdKobo: 500000 },
    };
    jest
      .mocked(fraudControllerListFraudFlagsV1)
      .mockResolvedValue(listResponse([supervisorFlag]));
    render(<FraudFlagsPanel presentation="supervisor" />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Review case: Large redemption needing approval for Customer Amina Bello · Cashier Jane A',
      }),
    );
    const dialog = screen.getByRole('dialog', {
      name: 'Review flagged activity',
    });
    expect(within(dialog).getByText('Case summary')).toBeInTheDocument();
    expect(within(dialog).getByText('Key details')).toBeInTheDocument();
    expect(within(dialog).getByText('What ShopCity did')).toBeInTheDocument();
    expect(within(dialog).getByText('Suggested review')).toBeInTheDocument();
    expect(within(dialog).getByText('₦7,500.00')).toBeInTheDocument();
    expect(
      within(dialog).queryByText('Backend response'),
    ).not.toBeInTheDocument();
    const technicalReference = within(dialog).getByText('Technical reference');
    expect(technicalReference.closest('details')).not.toHaveAttribute('open');

    fireEvent.click(technicalReference);
    expect(technicalReference.closest('details')).toHaveAttribute('open');
    expect(within(dialog).getByText('FR-HV-003')).toBeInTheDocument();
    expect(
      within(dialog).getByText('case-12345678-private-id'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Copy technical reference' }),
    ).toBeInTheDocument();
  });

  it('filters Supervisor cases by human category, status, priority, and branch', async () => {
    const purchase = {
      ...fraudFlag,
      id: 'case-purchase',
      ruleCode: 'FR-HV-001',
      branchId: 'branch-1',
      branchName: 'Wuse',
      customerName: 'Amina Bello',
    };
    const staffPattern = {
      ...fraudFlag,
      id: 'case-staff-pattern',
      ruleCode: 'FR-CASH-001',
      severity: 'MEDIUM',
      status: 'ACKNOWLEDGED',
      branchId: 'branch-2',
      branchName: 'Maitama',
      customerName: 'Bola Ade',
      evidence: { cashierCount: 8, sampleSize: 10 },
    };
    jest
      .mocked(fraudControllerListFraudFlagsV1)
      .mockResolvedValue(listResponse([purchase, staffPattern]));
    render(<FraudFlagsPanel presentation="supervisor" />);

    expect(
      await screen.findByRole('button', {
        name: 'Review case: Purchase activity differs from peers for Customer Bola Ade',
      }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Category: All activity' }),
    );
    fireEvent.click(screen.getByRole('option', { name: 'Transactions' }));
    expect(screen.getByText('1 shown')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Category: Transactions' }),
    );
    fireEvent.click(screen.getByRole('option', { name: 'Staff activity' }));
    expect(screen.getByText('1 shown')).toBeInTheDocument();
    expect(
      screen.getByText('Purchase activity differs from peers'),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Review status: All statuses' }),
    );
    fireEvent.click(screen.getByRole('option', { name: 'Under review' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Priority: All priorities' }),
    );
    fireEvent.click(screen.getByRole('option', { name: 'Needs attention' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Branch: All branches' }),
    );
    fireEvent.click(screen.getByRole('option', { name: 'Maitama' }));

    expect(screen.getByText('1 shown')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Review case: Purchase activity differs from peers for Customer Bola Ade',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: 'Review case: Purchase above the review threshold for Customer Amina Bello',
      }),
    ).not.toBeInTheDocument();
  });

  it('reports a successful Supervisor decision from the accepted response', async () => {
    const supervisorFlag = {
      ...fraudFlag,
      id: 'case-2',
      ruleCode: 'FR-HV-003',
      customerName: 'Bola Ade',
    };
    jest
      .mocked(fraudControllerListFraudFlagsV1)
      .mockResolvedValue(listResponse([supervisorFlag]));
    jest.mocked(fraudControllerDecideFraudFlagV1).mockResolvedValue({
      status: 200,
      data: { success: true, data: { id: 'case-2', status: 'ACKNOWLEDGED' } },
    } as never);
    render(<FraudFlagsPanel presentation="supervisor" />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Review case: Large redemption needing approval for Customer Bola Ade',
      }),
    );
    const dialog = screen.getByRole('dialog', {
      name: 'Review flagged activity',
    });
    fireEvent.change(within(dialog).getByLabelText('Decision reason'), {
      target: { value: 'Approval record checked' },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Record decision' }),
    );

    await waitFor(() => {
      expect(fraudControllerDecideFraudFlagV1).toHaveBeenCalledWith(
        'case-2',
        { decision: 'ACKNOWLEDGED', reason: 'Approval record checked' },
        expect.objectContaining({ headers: expect.any(Object) }),
      );
    });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Case under review',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('preserves case selection and decision submission', async () => {
    const secondFlag = {
      ...fraudFlag,
      id: 'fraud-2',
      ruleCode: 'LOW_VALUE',
      severity: 'LOW',
      customer: { fullName: 'Bola Ade' },
    };
    jest
      .mocked(fraudControllerListFraudFlagsV1)
      .mockResolvedValue(listResponse([fraudFlag, secondFlag]));
    jest.mocked(fraudControllerDecideFraudFlagV1).mockResolvedValue({
      status: 200,
      data: { success: true, data: { id: 'fraud-2', status: 'RESOLVED' } },
    } as never);
    render(<FraudFlagsPanel />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Review case: LOW_VALUE for Bola Ade',
      }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Review fraud case' });
    expect(
      screen.getByRole('button', {
        name: 'Review case: LOW_VALUE for Bola Ade',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(dialog).getByText(/Bola Ade · LOW · OPEN/),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: 'Submit decision' }),
    ).toBeDisabled();

    fireEvent.click(within(dialog).getByRole('radio', { name: 'Resolve' }));
    fireEvent.change(within(dialog).getByLabelText('Fraud decision reason'), {
      target: { value: 'Confirmed for resolution' },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Submit decision' }),
    );

    await waitFor(() => {
      expect(fraudControllerDecideFraudFlagV1).toHaveBeenCalledWith(
        'fraud-2',
        { decision: 'RESOLVED', reason: 'Confirmed for resolution' },
        expect.objectContaining({ headers: expect.any(Object) }),
      );
    });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Backend response')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('paginates five fraud results with accessible icon controls', async () => {
    jest.mocked(fraudControllerListFraudFlagsV1).mockResolvedValue(
      listResponse(
        Array.from({ length: 6 }, (_, index) => ({
          ...fraudFlag,
          id: `fraud-${index + 1}`,
          ruleCode: `RULE_${index + 1}`,
          customer: { fullName: `Customer ${index + 1}` },
        })),
      ),
    );
    render(<FraudFlagsPanel />);

    const results = screen.getByRole('region', { name: 'Fraud flag list' });
    expect(
      await within(results).findByRole('row', { name: /RULE_1 Customer 1/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
    expect(within(results).queryByText('RULE_6')).not.toBeInTheDocument();
    expect(screen.getByText('Page 1')).toBeInTheDocument();
    expect(
      within(results).getByRole('navigation', { name: 'Fraud result pages' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(
      await within(results).findByRole('row', { name: /RULE_6 Customer 6/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('Page 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled();
  });
});
