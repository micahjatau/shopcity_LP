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
  return { status: 200, data: { data: { items } } } as never;
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
    expect(
      within(results).getByRole('cell', { name: 'OPEN' }),
    ).toBeInTheDocument();
    expect(
      within(results).getByRole('cell', { name: 'HIGH' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Review HIGH_VALUE for Amina Bello' }),
    ).toHaveAttribute('aria-pressed', 'false');
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
        name: 'Review LOW_VALUE for Bola Ade',
      }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Review fraud case' });
    expect(
      screen.getByRole('button', { name: 'Review LOW_VALUE for Bola Ade' }),
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
