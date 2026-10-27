import { render, screen } from '@testing-library/react';
import { CustomerRegistrationReviewDialog } from '../components/workflows/customer-registration-review-dialog';

describe('CustomerRegistrationReviewDialog', () => {
  it.each([
    {
      loyaltyConsent: true,
      marketingOptIn: true,
      loyaltyLabel: 'Granted',
      marketingLabel: 'Opted in',
    },
    {
      loyaltyConsent: true,
      marketingOptIn: false,
      loyaltyLabel: 'Granted',
      marketingLabel: 'Not opted in',
    },
    {
      loyaltyConsent: false,
      marketingOptIn: false,
      loyaltyLabel: 'Not granted',
      marketingLabel: 'Not opted in',
    },
  ])(
    'shows the captured consent choices',
    ({ loyaltyConsent, marketingOptIn, loyaltyLabel, marketingLabel }) => {
      render(
        <CustomerRegistrationReviewDialog
          open
          customer={{
            fullName: 'Ada Shopper',
            phone: '+2348000000000',
            cardSerialNumber: 'CARD-001',
            loyaltyConsent,
            marketingOptIn,
          }}
          onEdit={jest.fn()}
          onConfirm={jest.fn()}
          busy={false}
        />,
      );

      expect(screen.getByText('Loyalty consent')).toBeInTheDocument();
      expect(screen.getByText(loyaltyLabel)).toBeInTheDocument();
      expect(screen.getByText('Marketing opt-in')).toBeInTheDocument();
      expect(screen.getByText(marketingLabel)).toBeInTheDocument();
    },
  );
});
