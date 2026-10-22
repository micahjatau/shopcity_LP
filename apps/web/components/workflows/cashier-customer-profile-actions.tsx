'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CashierMarketingWithdrawal } from './cashier-marketing-withdrawal';

export function CashierCustomerProfileActions() {
  const searchParams = useSearchParams();
  const customerId = searchParams.get('id');
  const cardSerial = searchParams.get('card');
  const cardQuery = cardSerial ? `?card=${encodeURIComponent(cardSerial)}` : '';

  if (!customerId) return null;

  return (
    <nav
      className="cashier-customer-profile-actions"
      aria-label="Customer actions"
    >
      <div>
        <h2>Customer actions</h2>
        <p>
          Card verification is required before a purchase or redemption can
          continue.
        </p>
      </div>
      <div className="cashier-customer-profile-actions__buttons">
        <Link
          className="cashier-primary-action"
          href={`/cashier/earn${cardQuery}`}
        >
          Capture Purchase
        </Link>
        <Link
          className="cashier-secondary-action"
          href={`/cashier/redeem${cardQuery}`}
        >
          Redeem Credit
        </Link>
      </div>
      <CashierMarketingWithdrawal customerId={customerId} />
    </nav>
  );
}
