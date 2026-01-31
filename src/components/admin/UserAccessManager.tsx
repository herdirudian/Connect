'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PERMISSIONS, PERMISSION_LABELS, ROLE_DEFAULT_PERMISSIONS } from '@/lib/permissions';
import { Shield, Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface UserAccessManagerProps {
  user: {
    id: string;
    name: string;
    role: string;
    permissions: string | null;
  };
}

export function UserAccessManager({ user }: UserAccessManagerProps) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(user.role);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    user.permissions ? JSON.parse(user.permissions) : []
  );
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    // Auto-select default permissions for the role
    if (newRole in ROLE_DEFAULT_PERMISSIONS) {
      setSelectedPermissions(ROLE_DEFAULT_PERMISSIONS[newRole as keyof typeof ROLE_DEFAULT_PERMISSIONS]);
    }
  };

  const togglePermission = (permission: string) => {
    if (selectedPermissions.includes(permission)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== permission));
    } else {
      setSelectedPermissions([...selectedPermissions, permission]);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/access`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, permissions: selectedPermissions }),
      });

      if (!res.ok) throw new Error('Failed to update access');

      toast({
        title: "Access Updated",
        description: `Successfully updated access for ${user.name}`,
      });
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <Shield size={14} />
        Manage Access
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Manage Access: {user.name}</h2>
              <p className="text-sm text-gray-500">Assign role and specific permissions.</p>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <div className="flex gap-2 flex-wrap">
                  {['MEMBER', 'STAFF', 'VERIFICATOR', 'ADMIN'].map((r) => (
                    <button
                      key={r}
                      onClick={() => handleRoleChange(r)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        role === r 
                          ? 'bg-brand text-white border-brand' 
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Permissions */}
              <div>
                <label className="block text-sm font-medium mb-3">Permissions</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.values(PERMISSIONS).map((perm) => (
                    <div 
                      key={perm}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPermissions.includes(perm)
                          ? 'bg-brand-50 border-brand-200'
                          : 'border-gray-100 hover:bg-gray-50'
                      }`}
                      onClick={() => togglePermission(perm)}
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors ${
                        selectedPermissions.includes(perm)
                          ? 'bg-brand border-brand text-white'
                          : 'bg-white border-gray-300'
                      }`}>
                        {selectedPermissions.includes(perm) && <Check size={12} />}
                      </div>
                      <span className="text-sm text-gray-700">
                        {PERMISSION_LABELS[perm] || perm}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 rounded-b-lg">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading} className="min-w-[100px]">
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
