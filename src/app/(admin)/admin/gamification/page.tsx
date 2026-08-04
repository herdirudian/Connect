'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge as BadgeUI } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit2, Trash2, Map, Award, CheckCircle2, Circle, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

interface Mission {
  id: string;
  name: string;
  targetCount: number;
  pointsReward: number;
}

interface Passport {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  active: boolean;
  missions: Mission[];
}

interface Badge {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  condition: string | null;
  active: boolean;
}

export default function AdminGamificationPage() {
  const { toast } = useToast();
  const [passports, setPassports] = useState<Passport[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [modalConfig, setModalConfig] = useState<{
    type: 'passport' | 'mission' | 'badge' | null;
    action: 'add' | 'edit';
    isOpen: boolean;
    data: any;
    parentPassportId?: string;
  }>({ type: null, action: 'add', isOpen: false, data: {} });

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [pRes, bRes] = await Promise.all([
        fetch('/api/gamification/passports'),
        fetch('/api/gamification/badges')
      ]);
      if (pRes.ok) setPassports(await pRes.json());
      if (bRes.ok) setBadges(await bRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, field: string) {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', e.target.files[0]);
      const res = await fetch('/api/upload', { method: 'POST', body: uploadData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setModalConfig(prev => ({ ...prev, data: { ...prev.data, [field]: data.url } }));
    } catch (error) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    try {
      const { type, action, data, parentPassportId } = modalConfig;
      let url = '';
      if (type === 'passport') url = `/api/gamification/passports${action === 'edit' ? `/${data.id}` : ''}`;
      else if (type === 'mission') url = `/api/gamification/missions${action === 'edit' ? `/${data.id}` : ''}`;
      else if (type === 'badge') url = `/api/gamification/badges${action === 'edit' ? `/${data.id}` : ''}`;

      const payload = { ...data };
      if (type === 'mission' && action === 'add') payload.passportId = parentPassportId;

      const res = await fetch(url, {
        method: action === 'add' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast({ title: 'Success', description: 'Data saved successfully' });
        setModalConfig({ type: null, action: 'add', isOpen: false, data: {} });
        fetchData();
      } else {
        toast({ title: 'Error', description: 'Failed to save data', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to save data', variant: 'destructive' });
    }
  }

  async function handleDelete(type: 'passport' | 'mission' | 'badge', id: string) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      let url = '';
      if (type === 'passport') url = `/api/gamification/passports/${id}`;
      else if (type === 'mission') url = `/api/gamification/missions/${id}`;
      else if (type === 'badge') url = `/api/gamification/badges/${id}`;

      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Success', description: 'Item deleted' });
        fetchData();
      } else {
        toast({ title: 'Error', description: 'Failed to delete item', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to delete item', variant: 'destructive' });
    }
  }

  const openModal = (type: 'passport' | 'mission' | 'badge', action: 'add' | 'edit', data: any = {}, parentPassportId?: string) => {
    setModalConfig({ type, action, isOpen: true, data, parentPassportId });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 uppercase italic">Gamification</h2>
        <p className="text-muted-foreground">Kelola Passport, Misi, dan Lencana (Badge) untuk member.</p>
      </div>

      <Tabs defaultValue="passports" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8 bg-gray-100 p-1 rounded-2xl">
          <TabsTrigger value="passports" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-brand data-[state=active]:shadow-sm">Passports & Missions</TabsTrigger>
          <TabsTrigger value="badges" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-brand data-[state=active]:shadow-sm">Badges</TabsTrigger>
        </TabsList>

        <TabsContent value="passports" className="space-y-6">
          <div className="flex justify-end">
            <Button className="bg-brand hover:bg-brand-dark" onClick={() => openModal('passport', 'add', { active: true })}>
              <Plus size={16} className="mr-2" /> Add Passport
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {loading ? <div className="p-4 text-center">Loading...</div> : passports.map(passport => (
              <Card key={passport.id} className="overflow-hidden border-gray-100 shadow-md">
                <div className="h-40 bg-gray-900 relative">
                  {passport.imageUrl && <Image src={passport.imageUrl} alt={passport.name} fill className="object-cover opacity-50" />}
                  <div className="absolute top-4 right-4">
                    <BadgeUI className={passport.active ? 'bg-green-500' : 'bg-gray-400'}>
                      {passport.active ? 'Active' : 'Inactive'}
                    </BadgeUI>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h3 className="text-xl font-black uppercase">{passport.name}</h3>
                  </div>
                </div>
                <CardContent className="p-6">
                  <p className="text-sm text-gray-600 mb-6">{passport.description}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-gray-900 uppercase text-xs tracking-wider">Missions ({passport.missions?.length || 0})</h4>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openModal('mission', 'add', { targetCount: 1, pointsReward: 10 }, passport.id)}>
                      <Plus size={14} className="mr-1" /> Add Mission
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {passport.missions?.map(mission => (
                      <div key={mission.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm text-gray-900">{mission.name}</p>
                          <p className="text-xs text-gray-500">Target: {mission.targetCount}x | Reward: <span className="text-brand font-bold">{mission.pointsReward} pts</span></p>
                        </div>
                        <div className="flex gap-2">
                          <button className="text-gray-400 hover:text-brand" onClick={() => openModal('mission', 'edit', mission, passport.id)}><Edit2 size={14} /></button>
                          <button className="text-gray-400 hover:text-red-500" onClick={() => handleDelete('mission', mission.id)}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-4 border-t flex justify-end gap-3">
                    <Button variant="outline" size="sm" onClick={() => openModal('passport', 'edit', passport)}><Edit2 size={14} className="mr-2" /> Edit</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete('passport', passport.id)}><Trash2 size={14} className="mr-2" /> Delete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="badges" className="space-y-6">
          <div className="flex justify-end">
            <Button className="bg-brand hover:bg-brand-dark" onClick={() => openModal('badge', 'add', { active: true })}>
              <Plus size={16} className="mr-2" /> Add Badge
            </Button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold">
                <tr>
                  <th className="px-6 py-4">Badge</th>
                  <th className="px-6 py-4">Condition</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-6 py-4 text-center">Loading...</td></tr>
                ) : badges.map(badge => (
                  <tr key={badge.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 relative bg-brand-50 rounded-full flex items-center justify-center">
                          {badge.imageUrl ? <Image src={badge.imageUrl} alt={badge.name} fill className="object-contain p-1" /> : <Award className="text-brand" size={16} />}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{badge.name}</p>
                          <p className="text-xs text-gray-500">{badge.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">
                      {badge.condition || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <BadgeUI className={badge.active ? 'bg-green-500' : 'bg-gray-400'}>
                        {badge.active ? 'Active' : 'Inactive'}
                      </BadgeUI>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openModal('badge', 'edit', badge)}><Edit2 size={14} /></Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600" onClick={() => handleDelete('badge', badge.id)}><Trash2 size={14} /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Form Overlay */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 capitalize">
                {modalConfig.action} {modalConfig.type}
              </h3>
              <button onClick={() => setModalConfig({ ...modalConfig, isOpen: false })} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <Input 
                  value={modalConfig.data.name || ''} 
                  onChange={e => setModalConfig({ ...modalConfig, data: { ...modalConfig.data, name: e.target.value } })}
                  placeholder={`Enter ${modalConfig.type} name`}
                />
              </div>

              {modalConfig.type !== 'mission' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea 
                      className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={modalConfig.data.description || ''} 
                      onChange={e => setModalConfig({ ...modalConfig, data: { ...modalConfig.data, description: e.target.value } })}
                      placeholder="Description"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Image / Icon URL</label>
                    <div className="flex gap-3">
                      <Input 
                        value={modalConfig.data.imageUrl || ''} 
                        onChange={e => setModalConfig({ ...modalConfig, data: { ...modalConfig.data, imageUrl: e.target.value } })}
                        placeholder="https://..."
                      />
                      <div className="relative">
                        <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => handleFileUpload(e, 'imageUrl')} />
                        <Button variant="outline" type="button" disabled={uploading}>
                          {uploading ? <Loader2 className="animate-spin h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    {modalConfig.data.imageUrl && (
                      <div className="mt-3 relative w-32 h-32 rounded-xl overflow-hidden border bg-gray-50">
                        <Image src={modalConfig.data.imageUrl} alt="Preview" fill className="object-cover" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <input 
                      type="checkbox" 
                      id="isActive"
                      className="rounded border-gray-300 text-brand focus:ring-brand h-4 w-4"
                      checked={modalConfig.data.active !== false}
                      onChange={e => setModalConfig({ ...modalConfig, data: { ...modalConfig.data, active: e.target.checked } })}
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active (Visible to users)</label>
                  </div>
                </>
              )}

              {modalConfig.type === 'badge' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Condition (System Code)</label>
                  <Input 
                    value={modalConfig.data.condition || ''} 
                    onChange={e => setModalConfig({ ...modalConfig, data: { ...modalConfig.data, condition: e.target.value } })}
                    placeholder="e.g. COMPLETE_WELLNESS_PASSPORT"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Used by the backend to automatically award this badge.</p>
                </div>
              )}

              {modalConfig.type === 'mission' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Count</label>
                    <Input 
                      type="number"
                      value={modalConfig.data.targetCount || ''} 
                      onChange={e => setModalConfig({ ...modalConfig, data: { ...modalConfig.data, targetCount: e.target.value } })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Points Reward</label>
                    <Input 
                      type="number"
                      value={modalConfig.data.pointsReward || ''} 
                      onChange={e => setModalConfig({ ...modalConfig, data: { ...modalConfig.data, pointsReward: e.target.value } })}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}>Cancel</Button>
              <Button className="bg-brand hover:bg-brand-dark" onClick={handleSave}>Save {modalConfig.type}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}