import { SupervisorCustomerProfile } from '../../../../../components/workflows/supervisor-customer-workflows';

export default async function SupervisorCustomerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ customerId }, { q }] = await Promise.all([params, searchParams]);
  return (
    <SupervisorCustomerProfile
      customerId={customerId}
      returnQuery={typeof q === 'string' ? q : ''}
    />
  );
}
