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
      title="Cashier lookup"
      description="Dedicated lookup workflow for rehydrating authoritative customer and card context before cashier actions."
      initialCardSerial={initialCardSerial}
    />
  );
}
