import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CustomerRegistrationFlow } from '../components/workflows/customer-registration-flow';
import { customersControllerCreateCustomerV1 } from '../lib/api/generated-client';

jest.mock('../lib/api/generated-client', () => ({
  customersControllerCreateCustomerV1: jest.fn(),
}));

describe('CustomerRegistrationFlow', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps registration focused on supported fields and preserves one logical retry key', async () => {
    jest
      .mocked(customersControllerCreateCustomerV1)
      .mockResolvedValueOnce({ status: 503, data: { data: {} } } as never)
      .mockResolvedValueOnce({
        status: 201,
        data: { data: { id: 'customer-1' } },
      } as never);

    render(<CustomerRegistrationFlow backHref="/supervisor/customers" />);

    expect(
      screen.getByRole('heading', { name: 'Register new customer' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Customer registration' }),
    ).toHaveTextContent('Customer information');
    expect(
      document.querySelector('[data-od-id="register-information"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-od-id="register-review"]'),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector('[data-od-id="register-result"]'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/birthday|marketing/i),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Customer full name'), {
      target: { value: 'Ada Shopper' },
    });
    fireEvent.change(screen.getByLabelText('Customer phone'), {
      target: { value: '+2348000000000' },
    });
    fireEvent.change(screen.getByLabelText('Initial card serial number'), {
      target: { value: 'CARD-001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Review details' }));
    expect(
      document.querySelector('[data-od-id="register-information"]'),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector('[data-od-id="register-review"]'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Register customer' }));

    await waitFor(() =>
      expect(
        screen.getByText('Registration unavailable (503).'),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Register customer' }));

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Registration successful' }),
      ).toBeInTheDocument(),
    );
    expect(
      document.querySelector('[data-od-id="register-review"]'),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector('[data-od-id="register-result"]'),
    ).toBeInTheDocument();
    const calls = jest.mocked(customersControllerCreateCustomerV1).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][1]).toEqual(
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(calls[1][1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          'idempotency-key': (
            calls[0][1] as RequestInit & { headers: Record<string, string> }
          ).headers['idempotency-key'],
        }),
      }),
    );
  });
});
