import Link from 'next/link';
import { FraudFlagsPanel } from '../../../../components/workflows';

export default function AdminFraudPage() {
  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1>Fraud</h1>
          <p>
            Review flagged activity and record an acknowledgment or resolution.
          </p>
        </div>
        <Link href="/admin">Back to admin</Link>
      </header>
      <FraudFlagsPanel />
    </section>
  );
}
