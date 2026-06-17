'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, XCircle, Loader2, Image as ImageIcon, Link as LinkIcon, Save, Power } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Promotion {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  linkUrl: string | null;
  active: boolean;
  priority: number;
}

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    linkUrl: '',
    active: true,
    priority: '0',
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchPromotions();
  }, []);

  async function fetchPromotions() {
    try {
      const res = await fetch('/api/promotions');
      const data = await res.json();
      setPromotions(data);
    } catch (error) {
      console.error('Error fetching promotions:', error);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      title: '',
      description: '',
      imageUrl: '',
      linkUrl: '',
      active: true,
      priority: '0',
    });
    setEditingId(null);
    setIsAdding(false);
  }

  function handleEdit(promo: Promotion) {
    setFormData({
      title: promo.title,
      description: promo.description || '',
      imageUrl: promo.imageUrl,
      linkUrl: promo.linkUrl || '',
      active: promo.active,
      priority: promo.priority.toString(),
    });
    setEditingId(promo.id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const uploadData = new FormData();
    uploadData.append('file', file);
    
    setUploading(true);
    try {
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: uploadData,
        });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        setFormData(prev => ({ ...prev, imageUrl: data.url }));
    } catch (error) {
        alert('Failed to upload file');
    } finally {
        setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const url = editingId ? `/api/promotions/${editingId}` : '/api/promotions';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        resetForm();
        fetchPromotions();
      }
    } catch (error) {
      console.error('Error saving promotion:', error);
    }
  }

  async function toggleStatus(promo: Promotion) {
    try {
        await fetch(`/api/promotions/${promo.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...promo, active: !promo.active }),
        });
        fetchPromotions();
    } catch (error) {
        console.error('Error toggling status:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    try {
      const res = await fetch(`/api/promotions/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) fetchPromotions();
    } catch (error) {
        console.error('Error deleting promotion:', error);
    }
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 uppercase italic">Manage Carousel Banners</h2>
          <p className="text-muted-foreground">Add high-quality banners for the Explore Hub Landing.</p>
        </div>
        {!isAdding && (
            <Button onClick={() => setIsAdding(true)} className="bg-brand hover:bg-brand/90">
                <Plus size={16} className="mr-2" /> Add New Banner
            </Button>
        )}
      </div>

      {isAdding && (
        <Card className="border-gray-200 shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="text-lg font-bold uppercase">{editingId ? 'Edit Banner' : 'New Banner'}</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-500">Banner Title</label>
                  <Input 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g. Special Holiday Promo"
                    className="rounded-xl border-gray-300 focus:border-brand"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-500">Priority (Higher shows first)</label>
                  <Input 
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="rounded-xl border-gray-300 focus:border-brand"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-500">Short Description</label>
                  <Input 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Brief details about the promo"
                    className="rounded-xl border-gray-300 focus:border-brand"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-500">Banner Image (16:9 WebP/HD)</label>
                  <Input type="file" accept="image/*" onChange={handleFileUpload} className="rounded-xl border-gray-300" />
                  {uploading && <div className="text-xs text-brand animate-pulse font-bold mt-1">Uploading...</div>}
                  {formData.imageUrl && (
                    <div className="mt-2 relative group w-full aspect-video rounded-xl overflow-hidden border">
                        <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ImageIcon className="text-white" />
                        </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-500">Link URL (Optional)</label>
                  <Input 
                    value={formData.linkUrl}
                    onChange={(e) => setFormData({...formData, linkUrl: e.target.value})}
                    placeholder="https://..."
                    className="rounded-xl border-gray-300 focus:border-brand"
                  />
                  <p className="text-[10px] text-gray-400 mt-1 italic">Tamu akan diarahkan ke link ini saat mengklik banner.</p>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 border-t">
                <Button type="submit" className="flex-1 bg-brand hover:bg-brand/90 rounded-xl font-bold uppercase tracking-wider h-12">
                    <Save size={18} className="mr-2" /> {editingId ? 'Update Banner' : 'Create Banner'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} className="rounded-xl font-bold uppercase tracking-wider h-12 border-gray-300">
                    Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {promotions.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <ImageIcon className="mx-auto text-gray-300 mb-4" size={48} />
                <p className="text-gray-500 font-medium uppercase tracking-widest text-sm">No banners found</p>
            </div>
        )}

        {promotions.map((promo) => (
          <Card key={promo.id} className={`overflow-hidden border-none shadow-lg hover:shadow-2xl transition-all duration-300 rounded-3xl bg-white ${!promo.active ? 'opacity-60 grayscale' : ''}`}>
            <div className="relative aspect-video">
                <img src={promo.imageUrl} alt={promo.title} className="w-full h-full object-cover" />
                <div className="absolute top-4 left-4 flex gap-2">
                    <Badge className={promo.active ? 'bg-green-500' : 'bg-gray-500'}>
                        {promo.active ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                    <Badge variant="outline" className="bg-white/90 backdrop-blur-sm border-none shadow-sm font-black">
                        P{promo.priority}
                    </Badge>
                </div>
            </div>
            <CardContent className="p-5">
              <h3 className="font-black text-lg uppercase leading-tight mb-1">{promo.title}</h3>
              <p className="text-xs text-gray-500 line-clamp-2 min-h-[32px] mb-4">{promo.description || 'No description provided.'}</p>
              
              <div className="flex gap-2 pt-4 border-t border-gray-50">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(promo)} className="flex-1 hover:bg-gray-100 rounded-xl font-bold text-gray-600">
                    <Edit2 size={14} className="mr-1" /> Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toggleStatus(promo)} className={`flex-1 rounded-xl font-bold ${promo.active ? 'text-orange-500' : 'text-green-500'}`}>
                    <Power size={14} className="mr-1" /> {promo.active ? 'Disable' : 'Enable'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(promo.id)} className="hover:bg-red-50 text-red-500 rounded-xl font-bold">
                    <Trash2 size={14} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
