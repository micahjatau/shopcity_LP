import { render, screen } from '@testing-library/react';
import { TransactionWorkspace } from '../components/workflows/transaction-workspace';

jest.mock('../lib/api/generated-client', () => ({
  loyaltyControllerGetTransactionV1: jest.fn(),
  reversalsControllerReverseV1: jest.fn(),
}));

describe('TransactionWorkspace', () => {
  it('does not invent a supervisor destination for shared usage', () => {
    render(<TransactionWorkspace />);

    expect(
      screen.queryByRole('link', { name: /supervisor/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Transaction review' }),
    ).toBeInTheDocument();
  });

  it('accepts an explicit owning-workspace destination', () => {
    render(
      <TransactionWorkspace
        backHref="/admin"
        backLabel="Back to admin"
        relatedRoutes={[['/admin/approvals', 'Approvals']]}
      />,
    );

    expect(screen.getByRole('link', { name: 'Back to admin' })).toHaveAttribute(
      'href',
      '/admin',
    );
    expect(screen.getByRole('link', { name: 'Approvals' })).toHaveAttribute(
      'href',
      '/admin/approvals',
    );
  });
});
