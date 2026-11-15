import { AdminBranchProfile } from '../../../../../components/workflows/admin-branch-management';

export default async function AdminBranchProfilePage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  return <AdminBranchProfile branchId={branchId} />;
}
