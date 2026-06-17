'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, Ticket, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import AdminPriceScheduleDialog from '@/components/admin/AdminPriceScheduleDialog';

interface Attraction {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  points?: number;
  benefits: string; // JSON string
  imageUrl?: string;
  videoUrl?: string;
  status: 'OPEN' | 'MAINTENANCE' | 'CROWDED';
  waitTime?: string;
  tags?: string;
  active: boolean;
}

export default function AdminAttractionsPage() {
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    points: '0',
    benefits: '',
    imageUrl: '', 
    videoUrl: '',
    status: 'OPEN',
    waitTime: '',
    tags: '',
    active: true,
  });
  const [uploading, setUploading] = useState(false);
  const [pricingFor, setPricingFor] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchAttractions();
  }, []);

  async function fetchAttractions() {
    try {
      const res = await fetch('/api/attractions');
      const data = await res.json();
      setAttractions(data);
    } catch (error) {
      console.error('Error fetching attractions:', error);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({ 
      name: '', 
      description: '', 
      price: '', 
      originalPrice: '',
      points: '0',
      benefits: '', 
      imageUrl: '', 
      videoUrl: '',
      status: 'OPEN',
      waitTime: '',
      tags: '',
      active: true 
    });
    setIsAdding(false);
    setEditingId(null);
  }

  function handleEditClick(item: Attraction) {
    let benefitsString = '';
    try {
        const benefitsParsed = JSON.parse(item.benefits || '[]');
        if (Array.isArray(benefitsParsed)) {
            benefitsString = benefitsParsed.join(', ');
        }
    } catch (e) {
        benefitsString = item.benefits || '';
    }

    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      originalPrice: item.originalPrice ? item.originalPrice.toString() : '',
      points: item.points ? item.points.toString() : '0',
      benefits: benefitsString,
      imageUrl: item.imageUrl || '',
      videoUrl: item.videoUrl || '',
      status: item.status || 'OPEN',
      waitTime: item.waitTime || '',
      tags: item.tags || '',
      active: item.active,
    });
    setEditingId(item.id);
    setIsAdding(true); // Re-use the add form area for editing
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
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || 'Upload failed');
        }
        
        const data = await res.json();
        setFormData(prev => ({ ...prev, imageUrl: data.url }));
    } catch (error) {
        console.error('Error uploading file:', error);
        alert(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
        setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const benefitsArray = formData.benefits.split(',').map(b => b.trim()).filter(b => b);
      
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        points: parseInt(formData.points) || 0,
        benefits: benefitsArray,
      };

      let res;
      if (editingId) {
        res = await fetch(`/api/attractions/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/attractions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        resetForm();
        fetchAttractions();
      }
    } catch (error) {
      console.error('Error saving attraction:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this attraction?')) return;
    try {
      const res = await fetch(`/api/attractions/${id}`, { method: 'DELETE' });
      if (res.ok) fetchAttractions();
    } catch (error) {
      console.error('Error deleting attraction:', error);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Manage Attractions</h2>
          <p className="text-muted-foreground">Add or edit tickets and wahana.</p>
        </div>
        <Button 
          onClick={() => {
            if (isAdding) {
                resetForm();
            } else {
                setIsAdding(true);
            }
          }} 
          className="w-full md:w-auto"
        >
          {isAdding ? <><XCircle size={16} className="mr-2" /> Cancel</> : <><Plus size={16} className="mr-2" /> Add New</>}
        </Button>
      </div>

      {isAdding && (
        <Card className="mb-6 border-gray-200 shadow-md animate-in fade-in slide-in-from-top-4">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Attraction' : 'Add New Attraction'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Hot Air Balloon"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Price (IDR)</label>
                  <Input 
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    placeholder="50000"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Original Price (Optional)</label>
                  <Input 
                    type="number"
                    value={formData.originalPrice}
                    onChange={(e) => setFormData({...formData, originalPrice: e.target.value})}
                    placeholder="Fill to show discount"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Points Earned</label>
                  <Input 
                    type="number"
                    value={formData.points}
                    onChange={(e) => setFormData({...formData, points: e.target.value})}
                    placeholder="e.g. 50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ride Status</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="OPEN">Open (Buka)</option>
                    <option value="MAINTENANCE">Maintenance (Pemeliharaan)</option>
                    <option value="CROWDED">Crowded (Antrean Padat)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Wait Time (Estimasi Antrean)</label>
                  <Input 
                    value={formData.waitTime}
                    onChange={(e) => setFormData({...formData, waitTime: e.target.value})}
                    placeholder="e.g. 10-15 menit"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Tags (comma separated)</label>
                  <Input 
                    value={formData.tags}
                    onChange={(e) => setFormData({...formData, tags: e.target.value})}
                    placeholder="#RamahAnak, #Ekstrem"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Tell more about this attraction..."
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Image (Main Photo)</label>
                      <div className="flex gap-2">
                        <Input 
                            type="file" 
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            className="cursor-pointer"
                        />
                        {uploading && <Loader2 className="animate-spin h-10 w-10 text-brand" />}
                      </div>
                      {formData.imageUrl && (
                        <div className="mt-2 relative h-32 w-full rounded-md overflow-hidden border border-gray-200">
                            <img src={formData.imageUrl} alt="Preview" className="h-full w-full object-cover" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Short Video (URL)</label>
                      <Input 
                        value={formData.videoUrl}
                        onChange={(e) => setFormData({...formData, videoUrl: e.target.value})}
                        placeholder="https://.../video.mp4"
                      />
                      <p className="text-[10px] text-gray-500">Video 3-5s for Reels style loop</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Benefits (comma separated)</label>
                  <Input 
                    value={formData.benefits}
                    onChange={(e) => setFormData({...formData, benefits: e.target.value})}
                    placeholder="e.g. Safety gear included, 5 min ride, Photo op"
                  />
                </div>
                <div className="flex items-center space-x-2">
                    <input 
                        type="checkbox" 
                        id="active" 
                        checked={formData.active} 
                        onChange={(e) => setFormData({...formData, active: e.target.checked})}
                        className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                    />
                    <label htmlFor="active" className="text-sm font-medium text-gray-700">Active (Visible to members)</label>
                </div>
              </div>
              <Button type="submit" className="w-full bg-brand hover:bg-brand-dark text-white">
                {editingId ? 'Update Attraction' : 'Save Attraction'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {attractions.map((item) => (
          <Card key={item.id} className={`border-gray-200 shadow-sm hover:shadow-md transition-shadow ${!item.active ? 'opacity-60 bg-gray-50' : 'bg-white'}`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-full ${item.active ? 'bg-brand-50 text-brand' : 'bg-gray-100 text-gray-400'}`}>
                  <Ticket size={24} />
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)} className="h-8 w-8 text-gray-500 hover:text-blue-600">
                    <Edit2 size={16} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setPricingFor({ id: item.id, name: item.name })} className="h-8 w-8 text-gray-500 hover:text-amber-600" title="Manage Pricing">
                    <CheckCircle size={16} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8 text-gray-500 hover:text-red-600">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
              
              <h3 className="font-bold text-lg mb-1">{item.name}</h3>
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{item.description}</p>
              
              <div className="flex flex-wrap gap-1 mb-3">
                {item.status === 'OPEN' && <Badge className="bg-green-500 text-[10px] h-5">OPEN</Badge>}
                {item.status === 'MAINTENANCE' && <Badge variant="destructive" className="text-[10px] h-5">MAINTENANCE</Badge>}
                {item.status === 'CROWDED' && <Badge className="bg-orange-500 text-[10px] h-5">CROWDED</Badge>}
                {item.waitTime && <Badge variant="outline" className="text-[10px] h-5">⏳ {item.waitTime}</Badge>}
                {item.videoUrl && <Badge variant="secondary" className="text-[10px] h-5">🎥 VIDEO</Badge>}
              </div>

              {item.tags && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {item.tags.split(',').map(tag => (
                    <span key={tag} className="text-[9px] font-bold bg-brand/5 text-brand px-1.5 py-0.5 rounded uppercase border border-brand/10">{tag.trim()}</span>
                  ))}
                </div>
              )}

              {item.benefits && (
                <div className="text-[10px] text-gray-400 italic mb-4 line-clamp-1">
                  🎁 {JSON.parse(item.benefits || '[]').length} Benefits configured
                </div>
              )}

              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                <div className="flex flex-col">
                    {item.originalPrice && item.originalPrice > item.price && (
                        <span className="text-xs text-gray-500 line-through">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.originalPrice)}
                        </span>
                    )}
                    <span className="font-bold text-gray-900">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.price)}
                    </span>
                    {item.points ? (
                      <span className="text-xs text-amber-600 font-medium mt-1">
                        + {item.points} Points
                      </span>
                    ) : null}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                    {item.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
        {attractions.length === 0 && !loading && (
            <div className="col-span-full text-center py-12 text-gray-500">
                No attractions found. Click "Add New" to create one.
            </div>
        )}
      </div>
      {pricingFor && (
        <AdminPriceScheduleDialog
          attractionId={pricingFor.id}
          attractionName={pricingFor.name}
          open={!!pricingFor}
          onOpenChange={(open) => {
            if (!open) setPricingFor(null);
          }}
        />
      )}
    </div>
  );
}
