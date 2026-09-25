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
    expect(
      screen.getByRole('combobox', { name: 'Search ShopCity' }).parentElement
        ?.parentElement,
    ).toContainElement(screen.getByRole('button', { name: 'Customers' }));
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
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'No matching records for “Ada”.',
      ),
    );
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('keeps the action available for every category and does not open an empty list', () => {
    render(<GlobalShellSearch userRole="ADMIN" />);
    const input = screen.getByRole('combobox');
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    fireEvent.focus(input);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cards' }));
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('submits customer searches immediately and discards a result after clearing', async () => {
    let resolveSearch!: (value: unknown) => void;
    jest.mocked(customersControllerListCustomersV1).mockReturnValue(
      new Promise((resolve) => {
        resolveSearch = resolve;
      }) as never,
    );
    render(<GlobalShellSearch userRole="CASHIER" />);
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Ada' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(customersControllerListCustomersV1).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });
    resolveSearch({
      status: 200,
      data: { data: { items: [{ id: 'cust-1', fullName: 'Ada Shopper' }] } },
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(screen.queryByText('Ada Shopper')).not.toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('discards a customer result after switching to Cards', async () => {
    let resolveSearch!: (value: unknown) => void;
    jest.mocked(customersControllerListCustomersV1).mockReturnValue(
      new Promise((resolve) => {
        resolveSearch = resolve;
      }) as never,
    );
    render(<GlobalShellSearch userRole="ADMIN" />);
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Ada' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cards' }));
    resolveSearch({
      status: 200,
      data: { data: { items: [{ id: 'cust-1', fullName: 'Ada Shopper' }] } },
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(screen.queryByText('Ada Shopper')).not.toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('discards pending results when dismissed outside without restoring focus', async () => {
    let resolveSearch!: (value: unknown) => void;
    jest.mocked(customersControllerListCustomersV1).mockReturnValue(
      new Promise((resolve) => {
        resolveSearch = resolve;
      }) as never,
    );
    render(
      <>
        <GlobalShellSearch userRole="CASHIER" />
        <button>Outside</button>
      </>,
    );
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'Ada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    const outside = screen.getByRole('button', { name: 'Outside' });
    outside.focus();
    fireEvent.pointerDown(outside);
    expect(outside).toHaveFocus();
    resolveSearch({
      status: 200,
      data: { data: { items: [{ id: 'cust-1', fullName: 'Ada Shopper' }] } },
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('only calls exact card lookup after explicit submission', async () => {
    jest.mocked(cardsControllerLookupCardV1).mockResolvedValue({
      status: 200,
      data: { data: { serialNumber: 'CARD-001', customerName: 'Ada Shopper' } },
    } as never);
    render(<GlobalShellSearch userRole="CASHIER" />);
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

  it('routes Admin card results to the Admin card workspace', async () => {
    jest.mocked(cardsControllerLookupCardV1).mockResolvedValue({
      status: 200,
      data: { data: { serialNumber: 'CARD-001', customerName: 'Ada Shopper' } },
    } as never);
    render(<GlobalShellSearch userRole="ADMIN" />);
    fireEvent.click(screen.getByRole('button', { name: 'Cards' }));
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'CARD-001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByRole('option')).toHaveAttribute(
      'href',
      '/admin/cards?card=CARD-001',
    );
  });

  it('exposes the cashier category to Supervisor/Admin only', () => {
    const { unmount } = render(<GlobalShellSearch userRole="SUPERVISOR" />);
    expect(
      screen.getByRole('button', { name: 'Cashiers' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Customers' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cards' })).toBeInTheDocument();

    unmount();
    render(<GlobalShellSearch userRole="ADMIN" />);
    expect(
      screen.getByRole('button', { name: 'Cashiers' }),
    ).toBeInTheDocument();
  });
});
