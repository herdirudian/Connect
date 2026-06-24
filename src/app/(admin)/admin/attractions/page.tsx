'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Ticket, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  LayoutDashboard, 
  Zap, 
  Tent, 
  Utensils, 
  Map as MapIcon, 
  Heart,
  Upload,
  ChevronUp,
  ChevronDown,
  Image as ImageIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import AdminPriceScheduleDialog from '@/components/admin/AdminPriceScheduleDialog';

interface Attraction {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  originalPrice?: number;
  points?: number;
  benefits: string; // JSON string
  imageUrl?: string;
  videoUrl?: string;
  images?: string; // JSON string
  status: 'OPEN' | 'MAINTENANCE' | 'CROWDED';
  waitTime?: string;
  tags?: string;
  active: boolean;
  displayTarget: 'BOTH' | 'BOOKING' | 'EXPLORE';
}

export default function AdminAttractionsPage() {
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'RIDE',
    price: '',
    originalPrice: '',
    points: '0',
    benefits: '',
    imageUrl: '', 
    videoUrl: '',
    images: '',
    status: 'OPEN',
    waitTime: '',
    tags: '',
    active: true,
    displayTarget: 'BOTH' as 'BOTH' | 'BOOKING' | 'EXPLORE',
  });
  const [uploading, setUploading] = useState(false);
  const [pricingFor, setPricingFor] = useState<{ id: string; name: string } | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('ALL');

  const categories = [
    { id: 'ALL', label: 'Semua', icon: LayoutDashboard },
    { id: 'TICKET', label: 'Tiket Masuk', icon: Ticket },
    { id: 'RIDE', label: 'Wahana', icon: Zap },
    { id: 'STAY', label: 'Penginapan', icon: Tent },
    { id: 'FOOD', label: 'Cafe & Resto', icon: Utensils },
    { id: 'TREKKING', label: 'Trekking', icon: MapIcon },
    { id: 'PACKAGE', label: 'Paket Hemat', icon: Heart },
  ];

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
      category: 'RIDE',
      price: '', 
      originalPrice: '',
      points: '0',
      benefits: '', 
      imageUrl: '', 
      videoUrl: '',
      images: '',
      status: 'OPEN',
      waitTime: '',
      tags: '',
      active: true,
      displayTarget: 'BOTH'
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
      category: item.category || 'RIDE',
      price: item.price.toString(),
      originalPrice: item.originalPrice ? item.originalPrice.toString() : '',
      points: item.points ? item.points.toString() : '0',
      benefits: benefitsString,
      imageUrl: item.imageUrl || '',
      videoUrl: item.videoUrl || '',
      images: item.images || '',
      status: item.status || 'OPEN',
      waitTime: item.waitTime || '',
      tags: item.tags || '',
      active: item.active,
      displayTarget: item.displayTarget || 'BOTH',
    });
    setEditingId(item.id);
    setIsAdding(true); // Re-use the add form area for editing
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, field: 'imageUrl' | 'gallery') {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files);
    setUploading(true);
    
    try {
        const uploadedUrls: string[] = [];
        
        for (const file of files) {
            const uploadData = new FormData();
            uploadData.append('file', file);
            
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: uploadData,
            });
            
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Upload failed');
            }
            
            const data = await res.json();
            uploadedUrls.push(data.url);
        }
        
        if (field === 'imageUrl') {
            setFormData(prev => ({ ...prev, imageUrl: uploadedUrls[0] }));
        } else {
            // Append to existing gallery
            let currentGallery: string[] = [];
            try {
                currentGallery = formData.images ? JSON.parse(formData.images) : [];
                if (!Array.isArray(currentGallery)) currentGallery = [];
            } catch (e) {
                currentGallery = formData.images ? formData.images.split(',').map(s => s.trim()) : [];
            }
            
            const updatedGallery = [...currentGallery, ...uploadedUrls];
            setFormData(prev => ({ ...prev, images: JSON.stringify(updatedGallery) }));
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        alert(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
        setUploading(false);
    }
  }

  function moveGalleryItem(index: number, direction: 'up' | 'down') {
    try {
        let currentGallery = JSON.parse(formData.images || '[]');
        if (!Array.isArray(currentGallery)) return;
        
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= currentGallery.length) return;
        
        const updated = [...currentGallery];
        const temp = updated[index];
        updated[index] = updated[newIndex];
        updated[newIndex] = temp;
        
        setFormData(prev => ({ ...prev, images: JSON.stringify(updated) }));
    } catch (e) {
        console.error('Error reordering gallery:', e);
    }
  }

  function removeGalleryItem(index: number) {
    try {
        let currentGallery = JSON.parse(formData.images || '[]');
        if (!Array.isArray(currentGallery)) return;
        
        const updated = currentGallery.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, images: JSON.stringify(updated) }));
    } catch (e) {
        console.error('Error removing gallery item:', e);
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

  const filteredAttractions = attractions.filter(item => 
    activeCategoryFilter === 'ALL' || item.category === activeCategoryFilter
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 uppercase italic">Explore Products</h2>
          <p className="text-muted-foreground">Manage all products displayed in the Greeter Hub (Tickets, Rides, Stay, Food, etc).</p>
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

      {/* Category Tabs */}
      <div className="flex overflow-x-auto pb-2 gap-2 no-scrollbar border-b border-gray-100">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategoryFilter(cat.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold whitespace-nowrap transition-all border-b-2 ${
              activeCategoryFilter === cat.id 
                ? 'bg-brand/5 border-brand text-brand' 
                : 'bg-transparent border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            <cat.icon size={16} />
            <span className="text-sm">{cat.label}</span>
            <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 bg-gray-100 text-[10px]">
              {cat.id === 'ALL' 
                ? attractions.length 
                : attractions.filter(a => a.category === cat.id).length
              }
            </Badge>
          </button>
        ))}
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
                  <label className="text-sm font-medium">Product Category</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="TICKET">Tiket Masuk</option>
                    <option value="RIDE">Wahana</option>
                    <option value="STAY">Penginapan</option>
                    <option value="FOOD">Cafe & Resto</option>
                    <option value="TREKKING">Trekking</option>
                    <option value="PACKAGE">Paket Hemat / Terusan</option>
                  </select>
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
                            onChange={(e) => handleFileUpload(e, 'imageUrl')}
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
                <div className="space-y-4 md:col-span-2 p-6 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-bold flex items-center gap-2">
                        <ImageIcon size={16} className="text-brand" />
                        Gallery Images
                      </h4>
                      <p className="text-[10px] text-gray-500 italic">Upload beberapa foto untuk slider di halaman Explore (bisa diatur urutannya).</p>
                    </div>
                    <div className="flex gap-2">
                      <Input 
                          type="file" 
                          multiple
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'gallery')}
                          disabled={uploading}
                          className="hidden"
                          id="gallery-upload"
                      />
                      <label 
                        htmlFor="gallery-upload" 
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${uploading ? 'bg-gray-200 text-gray-400' : 'bg-brand text-white hover:bg-brand/90 shadow-md'}`}
                      >
                        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        Upload Photos
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {(() => {
                      try {
                        const images = JSON.parse(formData.images || '[]');
                        if (!Array.isArray(images)) return null;
                        return images.map((url, idx) => (
                          <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
                            <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                              <div className="flex justify-between">
                                <button 
                                  type="button"
                                  onClick={() => removeGalleryItem(idx)}
                                  className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                                <div className="bg-white/90 px-1.5 py-0.5 rounded text-[10px] font-bold text-gray-900 shadow-sm">
                                  #{idx + 1}
                                </div>
                              </div>
                              <div className="flex justify-center gap-2">
                                <button 
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => moveGalleryItem(idx, 'up')}
                                  className="p-1.5 bg-white/90 text-gray-700 rounded-lg hover:bg-brand hover:text-white transition-all disabled:opacity-50"
                                >
                                  <ChevronUp size={12} />
                                </button>
                                <button 
                                  type="button"
                                  disabled={idx === images.length - 1}
                                  onClick={() => moveGalleryItem(idx, 'down')}
                                  className="p-1.5 bg-white/90 text-gray-700 rounded-lg hover:bg-brand hover:text-white transition-all disabled:opacity-50"
                                >
                                  <ChevronDown size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ));
                      } catch (e) {
                        return null;
                      }
                    })()}
                  </div>
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

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Display Visibility (Tampilkan di mana?)</label>
                  <select 
                    value={formData.displayTarget}
                    onChange={(e) => setFormData({...formData, displayTarget: e.target.value as any})}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="BOTH">Tampilkan di Keduanya (Explore & Booking)</option>
                    <option value="EXPLORE">Hanya di Explore Hub (Greeter)</option>
                    <option value="BOOKING">Hanya di Halaman Booking (Tamu)</option>
                  </select>
                  <p className="text-[10px] text-gray-500 italic">Gunakan "Hanya di Explore Hub" jika Anda ingin menambahkan item yang hanya untuk presentasi Greeter (misal: Galeri Foto Wahana).</p>
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
        {filteredAttractions.map((item) => (
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
              <p className="text-[10px] font-black text-brand/60 uppercase tracking-widest mb-2">{item.category}</p>
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{item.description}</p>
              
              <div className="flex flex-wrap gap-1 mb-3">
                {item.status === 'OPEN' && <Badge className="bg-green-500 text-[10px] h-5">OPEN</Badge>}
                {item.status === 'MAINTENANCE' && <Badge variant="destructive" className="text-[10px] h-5">MAINTENANCE</Badge>}
                {item.status === 'CROWDED' && <Badge className="bg-orange-500 text-[10px] h-5">CROWDED</Badge>}
                {item.waitTime && <Badge variant="outline" className="text-[10px] h-5">⏳ {item.waitTime}</Badge>}
                {item.videoUrl && <Badge variant="secondary" className="text-[10px] h-5">🎥 VIDEO</Badge>}
                <Badge variant="outline" className={`text-[10px] h-5 ${
                  item.displayTarget === 'BOTH' ? 'bg-blue-50 text-blue-700' :
                  item.displayTarget === 'EXPLORE' ? 'bg-purple-50 text-purple-700' :
                  'bg-orange-50 text-orange-700'
                }`}>
                  📍 {item.displayTarget}
                </Badge>
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
        {filteredAttractions.length === 0 && !loading && (
            <div className="col-span-full text-center py-12 text-gray-500">
                No products found in this category.
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
