import { AdminStaffProfile } from '../../../../../components/workflows/admin-staff-management';

export default async function AdminStaffProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <AdminStaffProfile userId={userId} />;
}
