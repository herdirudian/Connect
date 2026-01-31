import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Shield, Check, Phone, Mail } from 'lucide-react';
import { UserAccessManager } from '@/components/admin/UserAccessManager';
import { CreateStaffDialog } from '@/components/admin/CreateStaffDialog';
import { PERMISSION_LABELS } from '@/lib/permissions';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { hasPermission, ROLE_DEFAULT_PERMISSIONS, PERMISSIONS } from '@/lib/permissions';

export default async function StaffPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value || '';
  const payload = verifyToken(token) as any;
  let role: string = '';
  let userPermissions: string[] = [];
  if (payload) {
    role = payload.role;
    let permsStr: string | null = (payload.permissions as string) ?? null;
    if (!permsStr && payload.userId) {
      const u = await prisma.user.findUnique({ where: { id: payload.userId }, select: { permissions: true } });
      permsStr = u?.permissions ?? null;
    }
    if (permsStr) {
      try { userPermissions = JSON.parse(permsStr); } catch { userPermissions = []; }
    }
    if (userPermissions.length === 0 && role in ROLE_DEFAULT_PERMISSIONS) {
      userPermissions = ROLE_DEFAULT_PERMISSIONS[role as keyof typeof ROLE_DEFAULT_PERMISSIONS];
    }
  }
  const canManageRoles = hasPermission(userPermissions, PERMISSIONS.MANAGE_ROLES);
  const users = await prisma.user.findMany({
    where: {
      role: {
        not: 'MEMBER'
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Manajemen Staff & Admin</h2>
          <p className="text-gray-500">Kelola akun internal, role, dan hak akses.</p>
        </div>
        {canManageRoles && (
          <div className="flex gap-2 w-full md:w-auto">
              <CreateStaffDialog />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {users.map((user) => (
            <Card key={user.id} className="overflow-hidden border-none shadow-md">
                <div className={`h-2 w-full ${
                    user.role === 'ADMIN' ? 'bg-purple-500' : 
                    user.role === 'VERIFICATOR' ? 'bg-orange-500' : 
                    'bg-blue-500'
                }`} />
                <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-lg">
                                {user.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">{user.name}</h3>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${
                                    user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 
                                    user.role === 'VERIFICATOR' ? 'bg-orange-100 text-orange-700' : 
                                    'bg-blue-100 text-blue-700'
                                }`}>
                                    {user.role}
                                </span>
                            </div>
                        </div>
                        {canManageRoles && (
                          <UserAccessManager user={{
                              id: user.id,
                              name: user.name,
                              role: user.role,
                              permissions: user.permissions
                          }} />
                        )}
                    </div>

                    <div className="space-y-2 mb-6">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail size={14} className="text-gray-400" />
                            {user.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone size={14} className="text-gray-400" />
                            {user.phoneNumber || '-'}
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Permissions</p>
                        <div className="flex flex-wrap gap-2">
                            {user.permissions ? (
                                JSON.parse(user.permissions).length > 0 ? (
                                    JSON.parse(user.permissions).slice(0, 5).map((perm: string) => (
                                        <span key={perm} className="inline-flex items-center px-2 py-1 rounded bg-gray-50 border border-gray-200 text-xs text-gray-600">
                                            {PERMISSION_LABELS[perm] || perm}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs text-gray-400 italic">No specific permissions</span>
                                )
                            ) : (
                                <span className="text-xs text-gray-400 italic">Default role permissions</span>
                            )}
                            {user.permissions && JSON.parse(user.permissions).length > 5 && (
                                <span className="inline-flex items-center px-2 py-1 rounded bg-gray-50 border border-gray-200 text-xs text-gray-500">
                                    +{JSON.parse(user.permissions).length - 5} more
                                </span>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        ))}
      </div>
    </div>
  );
}
