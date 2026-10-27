import { CashierWorkflowRoute } from '../../../../components/workflows/cashier-transaction-route';

type CashierEarnPageProps = {
  searchParams?: Promise<{
    card?: string | string[];
  }>;
};

export default async function CashierEarnPage({
  searchParams,
}: CashierEarnPageProps) {
  const params = (await searchParams) ?? {};
  const initialCardSerial = Array.isArray(params.card)
    ? params.card[0]
    : (params.card ?? null);

  return (
    <CashierWorkflowRoute
      kind="earn"
      title="Capture purchase"
      description="Record a POS receipt so ShopCity Credit can be issued to the customer wallet."
      initialCardSerial={initialCardSerial}
    />
  );
}
