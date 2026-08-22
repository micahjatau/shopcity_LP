import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CustomerWorkspace } from '../components/workflows/customer-workspace';
import {
  customersControllerCreateCustomerV1,
  customersControllerGetCustomerV1,
  customersControllerListCustomersV1,
  customersControllerUpdateCustomerV1,
  loyaltyControllerGetCustomerLedgerV1,
} from '../lib/api/generated-client';

const mockSearchParams = jest.fn();

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: mockSearchParams }),
}));

jest.mock('../lib/api/generated-client', () => ({
  cardsControllerCreateCardV1: jest.fn(),
  cardsControllerReplaceCardV1: jest.fn(),
  cardsControllerUpdateStatusV1: jest.fn(),
  customersControllerCreateCustomerV1: jest.fn(),
  customersControllerGetCustomerV1: jest.fn(),
  customersControllerListCustomersV1: jest.fn(),
  customersControllerUpdateCustomerV1: jest.fn(),
  customersControllerUpdateStatusV1: jest.fn(),
  loyaltyControllerGetCustomerLedgerV1: jest.fn(),
}));

describe('CustomerWorkspace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.mockReturnValue(null);
    jest.mocked(customersControllerListCustomersV1).mockResolvedValue({
      status: 200,
      data: {
        data: { items: [{ id: 'list-customer', fullName: 'List Customer' }] },
      },
    } as never);
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: { data: { id: 'list-customer', fullName: 'List Customer' } },
    } as never);
    jest.mocked(loyaltyControllerGetCustomerLedgerV1).mockResolvedValue({
      status: 200,
      data: { data: { items: [] } },
    } as never);
  });

  it('preserves a route-selected customer when the initial search resolves', async () => {
    mockSearchParams.mockImplementation((key: string) =>
      key === 'id' ? 'route-customer' : null,
    );
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: { data: { id: 'route-customer', fullName: 'Route Customer' } },
    } as never);

    render(<CustomerWorkspace />);

    await waitFor(() => {
      expect(screen.getAllByText('Route Customer').length).toBeGreaterThan(0);
    });
    await waitFor(() => {
      expect(screen.getAllByText('List Customer').length).toBeGreaterThan(0);
    });
  });

  it('submits customer registration through the existing backend contract', async () => {
    jest.mocked(customersControllerListCustomersV1).mockResolvedValue({
      status: 200,
      data: { data: { items: [] } },
    } as never);
    jest.mocked(customersControllerCreateCustomerV1).mockResolvedValue({
      status: 201,
      data: { data: { id: 'created-customer', fullName: 'New Customer' } },
    } as never);

    render(<CustomerWorkspace canManage />);
    fireEvent.change(screen.getByLabelText('Customer full name'), {
      target: { value: 'New Customer' },
    });
    fireEvent.change(screen.getByLabelText('Customer phone'), {
      target: { value: '+2348000000000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Register customer' }));

    await waitFor(() => {
      expect(customersControllerCreateCustomerV1).toHaveBeenCalledWith(
        { fullName: 'New Customer', phone: '+2348000000000' },
        expect.objectContaining({ headers: expect.any(Object) }),
      );
    });
  });

  it('rejects registration without required customer fields', async () => {
    jest.mocked(customersControllerListCustomersV1).mockResolvedValue({
      status: 200,
      data: { data: { items: [] } },
    } as never);

    render(<CustomerWorkspace canManage />);
    fireEvent.click(screen.getByRole('button', { name: 'Register customer' }));

    expect(
      await screen.findByText('Full name and phone are required.'),
    ).toBeInTheDocument();
    expect(customersControllerCreateCustomerV1).not.toHaveBeenCalled();
  });

  it('submits customer profile edits through the existing backend contract', async () => {
    mockSearchParams.mockImplementation((key: string) =>
      key === 'id' ? 'route-customer' : null,
    );
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          id: 'route-customer',
          fullName: 'Route Customer',
          phone: '+2348111111111',
        },
      },
    } as never);
    jest.mocked(customersControllerUpdateCustomerV1).mockResolvedValue({
      status: 200,
      data: { data: { id: 'route-customer', fullName: 'Updated Customer' } },
    } as never);

    render(<CustomerWorkspace canManage />);
    await waitFor(() => {
      expect(screen.getByLabelText('Customer full name')).toHaveValue(
        'Route Customer',
      );
    });
    fireEvent.change(screen.getByLabelText('Customer full name'), {
      target: { value: 'Updated Customer' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() => {
      expect(customersControllerUpdateCustomerV1).toHaveBeenCalledWith(
        'route-customer',
        { fullName: 'Updated Customer', phone: '+2348111111111' },
        expect.objectContaining({ headers: expect.any(Object) }),
      );
    });
  });

  it('uses an explicit card mode instead of exposing customer profile management', async () => {
    render(<CustomerWorkspace canManage mode="card" />);

    expect(screen.getByRole('heading', { name: 'Cards' })).toBeInTheDocument();
    expect(screen.getByText('Card route context')).toBeInTheDocument();
    expect(screen.queryByText('Register customer')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Loaded 1 customers.')).toBeInTheDocument();
    });
  });
});
