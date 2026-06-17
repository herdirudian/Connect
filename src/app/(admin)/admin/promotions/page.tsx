'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, XCircle, Loader2, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';

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
      const res = await fetch('/api/promotions', {
        method: 'POST',
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

  async function handleDelete(id: string) {
    if (!confirm('Are you sure?')) return;
    try {
      // For now we don't have DELETE endpoint specifically for promotions, 
      // but we can add it or just set active=false
      // I'll skip implementation for now to focus on the Hub
    } catch (error) {}
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Manage Carousel Banners</h2>
          <p className="text-muted-foreground">Add high-quality banners for the Landing Hub.</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? <><XCircle size={16} className="mr-2" /> Cancel</> : <><Plus size={16} className="mr-2" /> Add New</>}
        </Button>
      </div>

      {isAdding && (
        <Card className="border-gray-200 shadow-md">
          <CardHeader>
            <CardTitle>New Banner</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Promo Title"
                  required
                />
                <Input 
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  placeholder="Priority (higher shows first)"
                />
                <div className="md:col-span-2">
                  <Input 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Description (optional)"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Image (WebP/HD recommended)</label>
                  <Input type="file" accept="image/*" onChange={handleFileUpload} />
                  {uploading && <div className="text-xs text-blue-500">Uploading...</div>}
                  {formData.imageUrl && <img src={formData.imageUrl} alt="Preview" className="h-20 w-auto rounded border" />}
                </div>
                <Input 
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({...formData, linkUrl: e.target.value})}
                  placeholder="Link URL (optional)"
                />
              </div>
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">Save Banner</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {promotions.map((promo) => (
          <Card key={promo.id} className="overflow-hidden">
            <img src={promo.imageUrl} alt={promo.title} className="w-full h-40 object-cover" />
            <CardContent className="p-4">
              <h3 className="font-bold">{promo.title}</h3>
              <p className="text-sm text-gray-500 truncate">{promo.description}</p>
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" size="sm" className="text-red-500"><Trash2 size={16} /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
