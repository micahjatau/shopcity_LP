import Link from 'next/link';
import { ApprovalsPanel } from '../../../../components/workflows';

export default function AdminApprovalsPage() {
  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1>Approvals</h1>
          <p>Review pending transactions and recent decisions.</p>
        </div>
        <Link href="/admin">Back to admin</Link>
      </header>
      <ApprovalsPanel />
    </section>
  );
}
