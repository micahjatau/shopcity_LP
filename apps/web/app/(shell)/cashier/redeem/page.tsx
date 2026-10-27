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
      title="Redeem credit"
      description="Apply ShopCity Credit against a POS basket. The customer pays the remaining balance at the till."
      initialCardSerial={initialCardSerial}
    />
  );
}
