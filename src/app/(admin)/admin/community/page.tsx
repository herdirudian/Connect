'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge as BadgeUI } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit2, Trash2, Users, Image as ImageIcon, Heart, X } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

export default function AdminCommunityPage() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [modalConfig, setModalConfig] = useState<{
    type: 'group' | 'gallery' | null;
    action: 'add' | 'edit';
    isOpen: boolean;
    data: any;
  }>({ type: null, action: 'add', isOpen: false, data: {} });

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [gRes, galRes] = await Promise.all([
        fetch('/api/community/groups'),
        fetch('/api/community/gallery')
      ]);
      if (gRes.ok) setGroups(await gRes.json());
      if (galRes.ok) setGallery(await galRes.json());
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
      const { type, action, data } = modalConfig;
      let url = '';
      if (type === 'group') url = `/api/community/groups${action === 'edit' ? `/${data.id}` : ''}`;
      else if (type === 'gallery') url = `/api/community/gallery${action === 'edit' ? `/${data.id}` : ''}`;

      const res = await fetch(url, {
        method: action === 'add' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
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

  async function handleDelete(type: 'group' | 'gallery', id: string) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      let url = '';
      if (type === 'group') url = `/api/community/groups/${id}`;
      else if (type === 'gallery') url = `/api/community/gallery/${id}`;

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

  const openModal = (type: 'group' | 'gallery', action: 'add' | 'edit', data: any = {}) => {
    setModalConfig({ type, action, isOpen: true, data });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 uppercase italic">Community Manager</h2>
        <p className="text-muted-foreground">Kelola grup komunitas dan galeri momen member.</p>
      </div>

      <Tabs defaultValue="groups" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8 bg-gray-100 p-1 rounded-2xl">
          <TabsTrigger value="groups" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-brand data-[state=active]:shadow-sm">Groups</TabsTrigger>
          <TabsTrigger value="gallery" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-brand data-[state=active]:shadow-sm">Gallery</TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="space-y-6">
          <div className="flex justify-end">
            <Button className="bg-brand hover:bg-brand-dark" onClick={() => openModal('group', 'add', { active: true, color: 'bg-brand-50 text-brand' })}>
              <Plus size={16} className="mr-2" /> Add Group
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {loading ? <div className="col-span-full p-4 text-center">Loading...</div> : groups.map(group => (
              <Card key={group.id} className="overflow-hidden border-gray-100 shadow-md">
                <div className="h-40 bg-gray-900 relative">
                  {group.imageUrl && <Image src={group.imageUrl} alt={group.name} fill className="object-cover opacity-60" />}
                  <div className="absolute top-4 right-4">
                    <BadgeUI className={group.active ? 'bg-green-500' : 'bg-gray-400'}>
                      {group.active ? 'Active' : 'Inactive'}
                    </BadgeUI>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h3 className="text-xl font-black uppercase tracking-tight">{group.name}</h3>
                  </div>
                </div>
                <CardContent className="p-6">
                  <p className="text-sm text-gray-600 mb-6 line-clamp-2">{group.description}</p>
                  
                  <div className="flex items-center gap-2 mb-6">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-bold text-gray-700">{group._count?.members || 0} Members</span>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button variant="outline" size="sm" onClick={() => openModal('group', 'edit', group)}><Edit2 size={14} className="mr-2" /> Edit</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete('group', group.id)}><Trash2 size={14} className="mr-2" /> Delete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="gallery" className="space-y-6">
          <div className="flex justify-end">
            <Button className="bg-brand hover:bg-brand-dark" onClick={() => openModal('gallery', 'add', { active: true, likes: 0 })}>
              <Plus size={16} className="mr-2" /> Add Photo
            </Button>
          </div>

          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {loading ? <div className="col-span-full p-4 text-center">Loading...</div> : gallery.map(item => (
              <div key={item.id} className="group relative rounded-2xl overflow-hidden aspect-square bg-gray-100 shadow-sm">
                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4">
                  <div className="flex justify-end gap-2">
                    <button className="bg-white/20 hover:bg-white/40 p-2 rounded-lg text-white" onClick={() => openModal('gallery', 'edit', item)}>
                      <Edit2 size={14} />
                    </button>
                    <button className="bg-red-500/80 hover:bg-red-500 p-2 rounded-lg text-white" onClick={() => handleDelete('gallery', item.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm mb-1 line-clamp-1">{item.title}</p>
                    <div className="flex items-center text-white/80 text-xs">
                      <Heart className="w-3 h-3 mr-1" /> {item.likes} Likes
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
              
              {modalConfig.type === 'group' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                    <Input 
                      value={modalConfig.data.name || ''} 
                      onChange={e => setModalConfig({ ...modalConfig, data: { ...modalConfig.data, name: e.target.value } })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea 
                      className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={modalConfig.data.description || ''} 
                      onChange={e => setModalConfig({ ...modalConfig, data: { ...modalConfig.data, description: e.target.value } })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Color Theme (Tailwind Classes)</label>
                    <Input 
                      value={modalConfig.data.color || ''} 
                      placeholder="e.g. bg-brand-50 text-brand"
                      onChange={e => setModalConfig({ ...modalConfig, data: { ...modalConfig.data, color: e.target.value } })}
                    />
                  </div>
                </>
              )}

              {modalConfig.type === 'gallery' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Photo Title</label>
                    <Input 
                      value={modalConfig.data.title || ''} 
                      onChange={e => setModalConfig({ ...modalConfig, data: { ...modalConfig.data, title: e.target.value } })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Initial Likes</label>
                    <Input 
                      type="number"
                      value={modalConfig.data.likes || 0} 
                      onChange={e => setModalConfig({ ...modalConfig, data: { ...modalConfig.data, likes: parseInt(e.target.value) } })}
                    />
                  </div>
                </>
              )}

              {/* Common Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                <div className="mt-1 flex items-center gap-4">
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                    {modalConfig.data.imageUrl ? (
                      <Image src={modalConfig.data.imageUrl} alt="Preview" fill className="object-cover" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleFileUpload(e, 'imageUrl')} 
                      disabled={uploading}
                    />
                    <p className="text-xs text-gray-500 mt-2">Upload a high quality image (JPG, PNG).</p>
                  </div>
                </div>
              </div>

              {/* Common Active Toggle */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <input 
                  type="checkbox" 
                  id="active-toggle"
                  className="w-4 h-4 text-brand rounded border-gray-300 focus:ring-brand"
                  checked={modalConfig.data.active ?? true}
                  onChange={e => setModalConfig({ ...modalConfig, data: { ...modalConfig.data, active: e.target.checked } })}
                />
                <label htmlFor="active-toggle" className="text-sm font-medium text-gray-900">Active (Visible to members)</label>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}>Cancel</Button>
              <Button className="bg-brand hover:bg-brand-dark" onClick={handleSave} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Save Data'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
