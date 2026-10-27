import { CashierWorkflowRoute } from '../../../../components/workflows/cashier-transaction-route';

type CashierLookupPageProps = {
  searchParams?: Promise<{
    card?: string | string[];
  }>;
};

export default async function CashierLookupPage({
  searchParams,
}: CashierLookupPageProps) {
  const params = (await searchParams) ?? {};
  const initialCardSerial = Array.isArray(params.card)
    ? params.card[0]
    : (params.card ?? null);

  return (
    <CashierWorkflowRoute
      kind="lookup"
      title="Find customer"
      description="Search by phone number, card serial or name to continue a loyalty transaction."
      initialCardSerial={initialCardSerial}
    />
  );
}
