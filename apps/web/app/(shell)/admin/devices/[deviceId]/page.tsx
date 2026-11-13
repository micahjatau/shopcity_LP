import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DeviceManagement } from '../../../../../components/devices/device-management';

export default async function AdminDeviceProfilePage({
  params,
}: {
  params: Promise<{ deviceId: string }>;
}) {
  const { deviceId } = await params;
  return (
    <DeviceManagement
      profileDeviceId={deviceId}
      backLink={
        <Link className="admin-device-branch-back-link" href="/admin/devices">
          <ArrowLeft aria-hidden="true" size={16} />
          <span>Back to devices</span>
        </Link>
      }
    />
  );
}
