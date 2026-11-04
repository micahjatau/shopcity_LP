'use client';

import { ScannerContextScope } from '../../../components/scanner-context-scope';
import { AdminOverview } from '../../../components/workflows/admin-overview';

export default function AdminPage() {
  return (
    <section>
      <ScannerContextScope context="sync" />
      <AdminOverview />
    </section>
  );
}
