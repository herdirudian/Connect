'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { PERMISSIONS, PERMISSION_LABELS, ROLE_DEFAULT_PERMISSIONS } from '@/lib/permissions';
import { Loader2, Plus, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CreateStaffDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
    role: 'STAFF',
    permissions: ROLE_DEFAULT_PERMISSIONS.STAFF as string[],
  });

  const handleRoleChange = (role: string) => {
    setFormData({
      ...formData,
      role,
      permissions: ROLE_DEFAULT_PERMISSIONS[role as keyof typeof ROLE_DEFAULT_PERMISSIONS] || [],
    });
  };

  const togglePermission = (perm: string) => {
    if (formData.permissions.includes(perm)) {
        setFormData({
            ...formData,
            permissions: formData.permissions.filter(p => p !== perm)
        });
    } else {
        setFormData({
            ...formData,
            permissions: [...formData.permissions, perm]
        });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.details || data.error || 'Failed to create account');
      }

      toast({
        title: "Success",
        description: `Account created for ${data.name}`,
      });
      setOpen(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        phoneNumber: '',
        role: 'STAFF',
        permissions: ROLE_DEFAULT_PERMISSIONS.STAFF,
      });
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus size={16} /> Add Staff Account
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Create Staff Account</h2>
              <p className="text-sm text-gray-500">Add a new admin or staff member.</p>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Full Name</label>
                        <Input 
                            required 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Phone Number</label>
                        <Input 
                            value={formData.phoneNumber}
                            onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <Input 
                        type="email"
                        required 
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Password</label>
                    <Input 
                        type="password"
                        required 
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Role</label>
                    <div className="flex gap-2">
                        {['STAFF', 'VERIFICATOR', 'ADMIN'].map((r) => (
                            <button
                                type="button"
                                key={r}
                                onClick={() => handleRoleChange(r)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                    formData.role === r 
                                    ? 'bg-brand text-white border-brand' 
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-3">Permissions</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {Object.values(PERMISSIONS).map((perm) => (
                            <div 
                                key={perm}
                                className={`flex items-center p-2 rounded border cursor-pointer transition-colors ${
                                    formData.permissions.includes(perm)
                                    ? 'bg-brand-50 border-brand-200'
                                    : 'border-gray-100 hover:bg-gray-50'
                                }`}
                                onClick={() => togglePermission(perm)}
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center mr-2 ${
                                    formData.permissions.includes(perm)
                                    ? 'bg-brand border-brand text-white'
                                    : 'bg-white border-gray-300'
                                }`}>
                                    {formData.permissions.includes(perm) && <Check size={10} />}
                                </div>
                                <span className="text-xs text-gray-700">
                                    {PERMISSION_LABELS[perm] || perm}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 rounded-b-lg">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="min-w-[100px]">
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Create Account'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
