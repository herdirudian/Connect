
import { AnalyticsDashboard } from '@/components/admin/analytics/AnalyticsDashboard';
import { ROLE_DEFAULT_PERMISSIONS, hasPermission, PERMISSIONS } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/serverAuth';

export default async function AdminHomePage() {
  const auth = await getAuthUser();
  const role = auth?.role || '';
  let userPermissions: string[] = auth?.permissions || [];
  if (userPermissions.length === 0 && role in ROLE_DEFAULT_PERMISSIONS) {
    userPermissions = ROLE_DEFAULT_PERMISSIONS[role as keyof typeof ROLE_DEFAULT_PERMISSIONS];
  }
  if (!hasPermission(userPermissions, PERMISSIONS.VIEW_REPORTS)) {
    redirect('/admin/food');
  }
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard Analitik</h2>
          <p className="text-muted-foreground">Ringkasan pendapatan dan aktivitas di platform Anda.</p>
        </div>
      </div>

      <AnalyticsDashboard />

    </div>
  );
}
