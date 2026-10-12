import { CashierCustomerProfile } from '../../../../components/workflows/supervisor-customer-workflows';
import { CashierCustomerProfileActions } from '../../../../components/workflows/cashier-customer-profile-actions';
import { CustomerWorkspace } from '../../../../components/workflows/customer-workspace';

type CashierCustomersPageProps = {
  searchParams?: Promise<{
    id?: string | string[];
    card?: string | string[];
    tab?: string | string[];
  }>;
};

export default async function CashierCustomersPage({
  searchParams,
}: CashierCustomersPageProps) {
  const params = (await searchParams) ?? {};
  const customerId = Array.isArray(params.id)
    ? (params.id[0] ?? '')
    : (params.id ?? '');
  const cardHint = Array.isArray(params.card) ? params.card[0] : params.card;
  const initialTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;

  if (customerId) {
    return (
      <CashierCustomerProfile
        customerId={customerId}
        cardHint={cardHint}
        initialTab={initialTab}
      />
    );
  }

  return (
    <section
      className="cashier-customer-route"
      style={{
        display: 'grid',
        gap: 'var(--sc-spacing-5)',
        padding: 'clamp(4px, 1vw, 12px)',
        borderRadius: 'var(--sc-radius-xl)',
        background:
          'linear-gradient(145deg, rgba(255, 241, 241, 0.72), var(--sc-color-neutral-0))',
      }}
    >
      <CashierCustomerProfileActions />
      <CustomerWorkspace canManage={false} />
    </section>
  );
}
