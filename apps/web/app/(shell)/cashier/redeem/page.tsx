import { CashierWorkflowRoute } from '../../../../components/workflows/cashier-transaction-route';

type CashierRedeemPageProps = {
  searchParams?: Promise<{
    card?: string | string[];
  }>;
};

export default async function CashierRedeemPage({
  searchParams,
}: CashierRedeemPageProps) {
  const params = (await searchParams) ?? {};
  const initialCardSerial = Array.isArray(params.card)
    ? params.card[0]
    : (params.card ?? null);

  return (
    <CashierWorkflowRoute
      kind="redeem"
      title="Cashier redeem"
      description="Dedicated redeem workflow with route-backed lookup and authoritative backend balance checks."
      initialCardSerial={initialCardSerial}
    />
  );
}
