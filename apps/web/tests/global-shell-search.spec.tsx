import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { GlobalShellSearch } from '../components/global-shell-search';
import {
  cardsControllerLookupCardV1,
  customersControllerListCustomersV1,
  usersControllerListCashiersV1,
} from '../lib/api/generated-client';

jest.mock('../lib/api/generated-client', () => {
  const actual = jest.requireActual('../lib/api/generated-client');
  return {
    ...actual,
    cardsControllerLookupCardV1: jest.fn(),
    customersControllerListCustomersV1: jest.fn(),
    usersControllerListCashiersV1: jest.fn(),
  };
});

describe('GlobalShellSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.mocked(customersControllerListCustomersV1).mockResolvedValue({
      status: 200,
      data: { data: { items: [], nextCursor: null, hasMore: false } },
    } as never);
    jest.mocked(usersControllerListCashiersV1).mockResolvedValue({
      status: 200,
      data: { data: [] },
    } as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('limits Cashier categories and debounces customer discovery', async () => {
    render(<GlobalShellSearch userRole="CASHIER" />);
    fireEvent.focus(screen.getByRole('combobox'));
    expect(
      screen.getByRole('button', { name: 'Customers' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cards' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Cashiers' }),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Ada' },
    });
    expect(customersControllerListCustomersV1).not.toHaveBeenCalled();
    jest.advanceTimersByTime(280);
    await waitFor(() => {
      expect(customersControllerListCustomersV1).toHaveBeenCalledWith(
        { q: 'Ada', limit: '8', cursor: '' },
        expect.any(Object),
      );
    });
  });

  it('only calls exact card lookup after explicit submission', async () => {
    jest.mocked(cardsControllerLookupCardV1).mockResolvedValue({
      status: 200,
      data: { data: { serialNumber: 'CARD-001', customerName: 'Ada Shopper' } },
    } as never);
    render(<GlobalShellSearch userRole="CASHIER" />);
    fireEvent.focus(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('button', { name: 'Cards' }));
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'CARD-001' },
    });
    jest.advanceTimersByTime(500);
    expect(cardsControllerLookupCardV1).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => {
      expect(cardsControllerLookupCardV1).toHaveBeenCalledWith(
        'CARD-001',
        expect.any(Object),
      );
    });
    expect(await screen.findByText('Ada Shopper')).toBeInTheDocument();
  });

  it('exposes the cashier category to Supervisor/Admin only', () => {
    render(<GlobalShellSearch userRole="SUPERVISOR" />);
    fireEvent.focus(screen.getByRole('combobox'));
    expect(
      screen.getByRole('button', { name: 'Cashiers' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Customers' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cards' })).toBeInTheDocument();
  });
});
