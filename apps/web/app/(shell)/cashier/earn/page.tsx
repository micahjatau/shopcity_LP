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
    : params.card ?? null;

  return (
    <CashierWorkflowRoute
      kind="earn"
      title="Cashier earn"
      description="Dedicated earn workflow with route-backed lookup and authoritative backend confirmation."
      initialCardSerial={initialCardSerial}
    />
  );
}
