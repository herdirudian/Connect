import { ROLE_DEFAULT_PERMISSIONS } from '@/lib/permissions';
import { AdminShell } from '@/components/admin/AdminShell';
import { getAuthUser } from '@/lib/serverAuth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuthUser();
  const role = auth?.role || '';
  let userPermissions: string[] = auth?.permissions || [];
  if (userPermissions.length === 0 && role in ROLE_DEFAULT_PERMISSIONS) {
    userPermissions = ROLE_DEFAULT_PERMISSIONS[role as keyof typeof ROLE_DEFAULT_PERMISSIONS];
  }

  return (
    <AdminShell userPermissions={userPermissions}>
      {children}
    </AdminShell>
  );
}
