import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CustomerWorkspace } from '../components/workflows/customer-workspace';
import {
  cardsControllerCreateCardV1,
  cardsControllerReplaceCardV1,
  cardsControllerUpdateStatusV1,
  customersControllerCreateCustomerV1,
  customersControllerGetCustomerV1,
  customersControllerListCustomersV1,
  customersControllerUpdateCustomerV1,
  customersControllerUpdateStatusV1,
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
    fireEvent.change(screen.getByLabelText('Initial card serial number'), {
      target: { value: 'CARD-NEW-001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Register customer' }));

    await waitFor(() => {
      expect(customersControllerCreateCustomerV1).toHaveBeenCalledWith(
        {
          fullName: 'New Customer',
          phone: '+2348000000000',
          cardSerialNumber: 'CARD-NEW-001',
        },
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

  it('rejects registration without an initial card serial number', async () => {
    jest.mocked(customersControllerListCustomersV1).mockResolvedValue({
      status: 200,
      data: { data: { items: [] } },
    } as never);

    render(<CustomerWorkspace canManage />);
    fireEvent.change(screen.getByLabelText('Customer full name'), {
      target: { value: 'New Customer' },
    });
    fireEvent.change(screen.getByLabelText('Customer phone'), {
      target: { value: '+2348000000000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Register customer' }));

    expect(
      await screen.findByText('Initial card serial number is required.'),
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
    fireEvent.click(screen.getByLabelText('Customer is staff'));
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() => {
      expect(customersControllerUpdateCustomerV1).toHaveBeenCalledWith(
        'route-customer',
        {
          fullName: 'Updated Customer',
          phone: '+2348111111111',
          isStaff: true,
        },
        expect.objectContaining({ headers: expect.any(Object) }),
      );
    });
  });

  it('masks cashier customer detail and normalizes cashier summary fields', async () => {
    jest.mocked(customersControllerListCustomersV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          items: [
            {
              customerId: 'cashier-customer',
              fullName: 'Cashier Customer',
              maskedPhone: '+23480* *** 0001',
              cardStatus: 'ACTIVE',
              availableBalanceKobo: 1250,
            },
          ],
        },
      },
    } as never);
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          customerId: 'cashier-customer',
          fullName: 'Cashier Customer',
          maskedPhone: '+23480* *** 0001',
          cardStatus: 'ACTIVE',
          availableBalanceKobo: 1250,
          email: 'should-not-be-returned@example.com',
        },
      },
    } as never);

    render(<CustomerWorkspace />);

    await waitFor(() => {
      expect(screen.getByText('+23480* *** 0001')).toBeInTheDocument();
      expect(screen.getByText('ACTIVE')).toBeInTheDocument();
      expect(
        screen.queryByText('should-not-be-returned@example.com'),
      ).not.toBeInTheDocument();
    });
  });

  it('requires explicit confirmation before blocking a card', async () => {
    mockSearchParams.mockImplementation((key: string) =>
      key === 'id' ? 'route-customer' : null,
    );
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          id: 'route-customer',
          fullName: 'Route Customer',
          cards: [
            {
              id: 'card-1',
              serialNumber: 'CARD-1',
              status: 'ACTIVE',
              availableBalanceKobo: 0,
            },
          ],
        },
      },
    } as never);

    render(<CustomerWorkspace canManage />);

    await screen.findByRole('button', { name: 'CARD-1' });
    fireEvent.click(screen.getByRole('button', { name: 'CARD-1' }));
    fireEvent.click(screen.getByLabelText('BLOCKED'));
    fireEvent.click(screen.getByRole('button', { name: 'Update status' }));

    expect(
      await screen.findByText('Type BLOCK to confirm blocking this card.'),
    ).toBeInTheDocument();
    expect(cardsControllerUpdateStatusV1).not.toHaveBeenCalled();
  });

  it('submits card blocking after confirmation', async () => {
    mockSearchParams.mockImplementation((key: string) =>
      key === 'id' ? 'route-customer' : null,
    );
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          id: 'route-customer',
          fullName: 'Route Customer',
          cards: [
            {
              id: 'card-1',
              serialNumber: 'CARD-1',
              status: 'ACTIVE',
              availableBalanceKobo: 0,
            },
          ],
        },
      },
    } as never);
    jest.mocked(cardsControllerUpdateStatusV1).mockResolvedValue({
      status: 200,
      data: { data: { id: 'card-1', status: 'BLOCKED' } },
    } as never);

    render(<CustomerWorkspace canManage />);

    await screen.findByRole('button', { name: 'CARD-1' });
    fireEvent.click(screen.getByRole('button', { name: 'CARD-1' }));
    fireEvent.click(screen.getByLabelText('BLOCKED'));
    fireEvent.change(screen.getByLabelText('Card block confirmation'), {
      target: { value: 'BLOCK' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update status' }));

    await waitFor(() => {
      expect(cardsControllerUpdateStatusV1).toHaveBeenCalledWith(
        'card-1',
        { status: 'BLOCKED' },
        expect.objectContaining({ headers: expect.any(Object) }),
      );
    });
  });

  it('assigns a card through the management workflow', async () => {
    mockSearchParams.mockImplementation((key: string) =>
      key === 'id' ? 'route-customer' : null,
    );
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: {
        data: { id: 'route-customer', fullName: 'Route Customer', cards: [] },
      },
    } as never);
    jest.mocked(cardsControllerCreateCardV1).mockResolvedValue({
      status: 201,
      data: { data: { id: 'card-2', serialNumber: 'CARD-2' } },
    } as never);

    render(<CustomerWorkspace canManage />);
    await waitFor(() => {
      expect(screen.getAllByText('Route Customer').length).toBeGreaterThan(0);
    });
    fireEvent.change(screen.getByLabelText('Card serial'), {
      target: { value: 'CARD-2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Assign card' }));

    await waitFor(() => {
      expect(cardsControllerCreateCardV1).toHaveBeenCalledWith(
        { customerId: 'route-customer', serialNumber: 'CARD-2' },
        expect.objectContaining({ headers: expect.any(Object) }),
      );
    });
  });

  it('replaces a selected card after explicit confirmation', async () => {
    mockSearchParams.mockImplementation((key: string) =>
      key === 'id' ? 'route-customer' : null,
    );
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          id: 'route-customer',
          fullName: 'Route Customer',
          cards: [{ id: 'card-1', serialNumber: 'CARD-1', status: 'ACTIVE' }],
        },
      },
    } as never);
    jest.mocked(cardsControllerReplaceCardV1).mockResolvedValue({
      status: 201,
      data: { data: { id: 'card-2', serialNumber: 'CARD-2' } },
    } as never);

    render(<CustomerWorkspace canManage />);
    await screen.findByRole('button', { name: 'CARD-1' });
    fireEvent.click(screen.getByRole('button', { name: 'CARD-1' }));
    fireEvent.change(screen.getByLabelText('Replacement serial'), {
      target: { value: 'CARD-2' },
    });
    fireEvent.change(screen.getByLabelText('Replacement confirmation'), {
      target: { value: 'REPLACE' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Replace card' }));

    await waitFor(() => {
      expect(cardsControllerReplaceCardV1).toHaveBeenCalledWith(
        'card-1',
        { serialNumber: 'CARD-2' },
        expect.objectContaining({ headers: expect.any(Object) }),
      );
    });
  });

  it('updates customer status after explicit confirmation', async () => {
    mockSearchParams.mockImplementation((key: string) =>
      key === 'id' ? 'route-customer' : null,
    );
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          id: 'route-customer',
          fullName: 'Route Customer',
          status: 'ACTIVE',
        },
      },
    } as never);
    jest.mocked(customersControllerUpdateStatusV1).mockResolvedValue({
      status: 200,
      data: { data: { id: 'route-customer', status: 'BLOCKED' } },
    } as never);

    render(<CustomerWorkspace canManage />);
    await waitFor(() => {
      expect(screen.getAllByText('Route Customer').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByLabelText('Blocked'));
    fireEvent.change(screen.getByLabelText('Customer status confirmation'), {
      target: { value: 'UPDATE' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Update customer status' }),
    );

    await waitFor(() => {
      expect(customersControllerUpdateStatusV1).toHaveBeenCalledWith(
        'route-customer',
        { status: 'BLOCKED' },
        expect.objectContaining({ headers: expect.any(Object) }),
      );
    });
  });

  it('keeps cashier customer views read-only', async () => {
    mockSearchParams.mockImplementation((key: string) =>
      key === 'id' ? 'route-customer' : null,
    );
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          id: 'route-customer',
          fullName: 'Route Customer',
          cards: [{ id: 'card-1', serialNumber: 'CARD-1', status: 'ACTIVE' }],
        },
      },
    } as never);

    render(<CustomerWorkspace />);

    await waitFor(() => {
      expect(screen.getAllByText('Route Customer').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('Card management')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Assign card' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Customer is staff'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Update customer status' }),
    ).not.toBeInTheDocument();
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
