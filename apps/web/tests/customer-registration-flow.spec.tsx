import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CustomerRegistrationFlow } from '../components/workflows/customer-registration-flow';
import { customersControllerCreateCustomerV1 } from '../lib/api/generated-client';

jest.mock('../lib/api/generated-client', () => ({
  customersControllerCreateCustomerV1: jest.fn(),
}));

describe('CustomerRegistrationFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(customersControllerCreateCustomerV1).mockReset();
  });

  function fillDetails() {
    fireEvent.change(screen.getByLabelText('Customer full name'), {
      target: { value: 'Ada Shopper' },
    });
    fireEvent.change(screen.getByLabelText('Customer phone'), {
      target: { value: '+2348000000000' },
    });
    fireEvent.change(screen.getByLabelText('Initial card serial number'), {
      target: { value: 'CARD-001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Proceed' }));
  }

  function acceptAndReview(marketingOptIn = false) {
    fireEvent.click(
      screen.getByLabelText('Loyalty service consent (required)'),
    );
    if (marketingOptIn) {
      fireEvent.click(screen.getByLabelText('Marketing opt-in (optional)'));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Proceed' }));
  }

  it('requires customer details and required loyalty consent before review or mutation', () => {
    render(<CustomerRegistrationFlow backHref="/supervisor/customers" />);
    fireEvent.click(screen.getByRole('button', { name: 'Proceed' }));
    expect(screen.getByLabelText('Customer full name')).toBeInvalid();
    expect(screen.getByLabelText('Customer phone')).toBeInvalid();
    expect(screen.getByLabelText('Initial card serial number')).toBeInvalid();
    expect(customersControllerCreateCustomerV1).not.toHaveBeenCalled();

    fillDetails();
    expect(
      screen.getByRole('heading', { name: 'Consent' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Proceed' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loyalty-service consent is required.',
    );
    expect(customersControllerCreateCustomerV1).not.toHaveBeenCalled();
  });

  it('reviews consent choices and submits them to the API', async () => {
    jest.mocked(customersControllerCreateCustomerV1).mockResolvedValueOnce({
      status: 201,
      data: { data: { id: 'customer-1' } },
    } as never);
    render(<CustomerRegistrationFlow backHref="/supervisor/customers" />);
    fillDetails();
    acceptAndReview(true);

    expect(screen.getByRole('heading', { name: 'Review' })).toBeInTheDocument();
    expect(screen.getByText('Loyalty consent · v1.2')).toBeInTheDocument();
    expect(screen.getAllByText('Granted')).toHaveLength(2);
    expect(screen.getByText('Marketing opt-in')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Register customer' }));
    await screen.findByRole('heading', { name: 'Registration successful' });
    expect(customersControllerCreateCustomerV1).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Ada Shopper',
        phone: '+2348000000000',
        cardSerialNumber: 'CARD-001',
        loyaltyConsent: true,
        marketingOptIn: true,
      }),
      expect.anything(),
    );
  });

  it('preserves one idempotency key across an uncertain retry and never falsely succeeds', async () => {
    jest
      .mocked(customersControllerCreateCustomerV1)
      .mockResolvedValueOnce({ status: 503, data: { data: {} } } as never)
      .mockResolvedValueOnce({
        status: 201,
        data: { data: { id: 'customer-retry' } },
      } as never);
    render(<CustomerRegistrationFlow backHref="/supervisor/customers" />);
    fillDetails();
    acceptAndReview();
    fireEvent.click(screen.getByRole('button', { name: 'Register customer' }));
    expect(
      await screen.findByText('Registration unavailable (503).'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Registration successful' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Register customer' }));
    await screen.findByRole('heading', { name: 'Registration successful' });

    const calls = jest.mocked(customersControllerCreateCustomerV1).mock.calls;
    expect(calls).toHaveLength(2);
    const firstKey = (
      calls[0][1] as RequestInit & { headers: Record<string, string> }
    ).headers['idempotency-key'];
    const retryKey = (
      calls[1][1] as RequestInit & { headers: Record<string, string> }
    ).headers['idempotency-key'];
    expect(retryKey).toBe(firstKey);
    expect(calls[0][0]).toMatchObject({
      loyaltyConsent: true,
      marketingOptIn: false,
    });
  });
});
