import { CustomerRegistrationFlow } from '../../../../../components/workflows/customer-registration-flow';

export default function AdminNewCustomerPage() {
  return <CustomerRegistrationFlow backHref="/admin/customers" />;
}
