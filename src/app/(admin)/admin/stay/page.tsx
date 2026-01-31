'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, Tent, XCircle, Loader2, CalendarDays } from 'lucide-react';
import AllotmentManager from '@/components/AllotmentManager';

interface Accommodation {
  id: string;
  name: string;
  capacity: string;
  price: number;
  originalPrice?: number;
  stock: number;
  description: string;
  rating: number;
  benefits: string;
  imageUrl?: string;
  images?: string[];
  active: boolean;
  receptionEmail?: string;
}

export default function AdminStayPage() {
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    price: '',
    originalPrice: '',
    stock: '1', // Default to 1 to ensure bookable
    description: '',
    rating: '',
    benefits: '',
    imageUrl: '',
    images: [] as string[],
    active: true,
    receptionEmail: '',
  });
  const [managingAllotment, setManagingAllotment] = useState<Accommodation | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchAccommodations();
  }, []);

  async function fetchAccommodations() {
    try {
      const res = await fetch('/api/accommodations');
      const data = await res.json();
      setAccommodations(data);
    } catch (error) {
      console.error('Error fetching accommodations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setUploading(true);
    
    // Process each file
    const newImages = [...formData.images];
    let firstImage = formData.imageUrl;

    try {
        for (let i = 0; i < e.target.files.length; i++) {
            const file = e.target.files[i];
            const uploadData = new FormData();
            uploadData.append('file', file);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: uploadData,
            });
            
            if (!res.ok) {
                console.error(`Failed to upload ${file.name}`);
                continue;
            }
            
            const data = await res.json();
            newImages.push(data.url);
            
            // Set first uploaded image as main image if none exists
            if (!firstImage) {
                firstImage = data.url;
            }
        }
        
        setFormData(prev => ({ 
            ...prev, 
            images: newImages,
            imageUrl: firstImage || newImages[0] || '' 
        }));
    } catch (error) {
        console.error('Error uploading file:', error);
        alert(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
        setUploading(false);
    }
  }

  function removeImage(index: number) {
      const newImages = [...formData.images];
      newImages.splice(index, 1);
      
      // Update main image if we removed the first one or the one matching imageUrl
      let newMainImage = formData.imageUrl;
      if (newImages.length > 0) {
          // If the removed image was the main one, or if we just want to sync
          // Simple logic: Always keep imageUrl in sync with first image if it exists
          if (formData.images[index] === formData.imageUrl) {
               newMainImage = newImages[0];
          }
      } else {
          newMainImage = '';
      }
      
      setFormData(prev => ({
          ...prev,
          images: newImages,
          imageUrl: newMainImage
      }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const benefitsArray = formData.benefits.split(',').map(b => b.trim()).filter(b => b);

      const res = await fetch('/api/accommodations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          benefits: benefitsArray,
        }),
      });

      if (res.ok) {
        setIsAdding(false);
        setFormData({ name: '', capacity: '', price: '', originalPrice: '', stock: '1', description: '', rating: '', benefits: '', imageUrl: '', images: [], active: true, receptionEmail: '' });
        fetchAccommodations();
      }
    } catch (error) {
      console.error('Error adding accommodation:', error);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/accommodations/${id}`, { method: 'DELETE' });
      if (res.ok) fetchAccommodations();
    } catch (error) {
      console.error('Error deleting accommodation:', error);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    try {
      const benefitsArray = formData.benefits.split(',').map(b => b.trim()).filter(b => b);
      const res = await fetch(`/api/accommodations/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, benefits: benefitsArray }),
      });
      if (res.ok) {
        setEditingId(null);
        setFormData({ name: '', capacity: '', price: '', originalPrice: '', stock: '', description: '', rating: '', benefits: '', imageUrl: '', images: [], active: true, receptionEmail: '' });
        fetchAccommodations();
      }
    } catch (error) {
      console.error('Error updating accommodation:', error);
    }
  }

  function handleEditClick(item: Accommodation) {
    let benefitsStr = item.benefits;
    try {
      const parsed = JSON.parse(item.benefits);
      if (Array.isArray(parsed)) benefitsStr = parsed.join(', ');
    } catch {}

    setFormData({
      name: item.name,
      capacity: item.capacity,
      price: item.price.toString(),
      originalPrice: item.originalPrice ? item.originalPrice.toString() : '',
      stock: (item.stock || 0).toString(),
      description: item.description,
      rating: item.rating.toString(),
      benefits: benefitsStr,
      imageUrl: item.imageUrl || '',
      images: item.images || (item.imageUrl ? [item.imageUrl] : []),
      active: item.active,
      receptionEmail: (item as any).receptionEmail || '',
    });
    setEditingId(item.id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Manage Accommodations</h2>
          <p className="text-muted-foreground">Add or edit accommodation listings.</p>
        </div>
        <Button onClick={() => {
            setIsAdding(!isAdding);
            setEditingId(null);
            setFormData({ name: '', capacity: '', price: '', originalPrice: '', stock: '1', description: '', rating: '', benefits: '', imageUrl: '', active: true, receptionEmail: '' });
        }}>
          {isAdding ? <><XCircle className="mr-2 h-4 w-4" /> Cancel</> : <><Plus className="mr-2 h-4 w-4" /> Add Accommodation</>}
        </Button>
      </div>

      {isAdding && (
        <Card className="p-6 border-brand-100 shadow-lg">
          <form onSubmit={editingId ? handleUpdate : handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Capacity (People)</label>
              <Input 
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Price (IDR)</label>
              <Input 
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
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
              <label className="text-sm font-medium">Base Stock (Default Availability)</label>
              <Input 
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({...formData, stock: e.target.value})}
                required
              />
              <p className="text-xs text-muted-foreground">Set to 0 to close booking by default. Set &gt; 0 to allow booking.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reception Email (Notification)</label>
              <Input 
                type="email"
                value={formData.receptionEmail}
                onChange={(e) => setFormData({...formData, receptionEmail: e.target.value})}
                placeholder="reception@thelodge.com"
              />
              <p className="text-xs text-muted-foreground">Email to receive booking success notifications with details.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rating (0-5)</label>
              <Input 
                type="number"
                step="0.1"
                max="5"
                value={formData.rating}
                onChange={(e) => setFormData({...formData, rating: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Images</label>
              <div className="flex gap-2">
                <Input 
                    type="file" 
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="cursor-pointer"
                />
                {uploading && <Loader2 className="animate-spin h-10 w-10 text-brand" />}
              </div>
              
              {formData.images.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {formData.images.map((img, idx) => (
                        <div key={idx} className="relative group aspect-video rounded-md overflow-hidden border border-gray-200">
                            <img src={img} alt={`Preview ${idx}`} className="h-full w-full object-cover" />
                            <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <XCircle className="h-4 w-4" />
                            </button>
                            {img === formData.imageUrl && (
                                <div className="absolute bottom-1 left-1 bg-brand text-white text-[10px] px-2 py-0.5 rounded-full">
                                    Main
                                </div>
                            )}
                        </div>
                      ))}
                  </div>
              )}
              <Input 
                type="hidden"
                value={formData.imageUrl}
                readOnly
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <Input 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Benefits (comma separated)</label>
              <Input 
                value={formData.benefits}
                onChange={(e) => setFormData({...formData, benefits: e.target.value})}
                placeholder="WiFi, Breakfast, Pool Access"
              />
            </div>
             <div className="flex items-center space-x-2 md:col-span-2">
              <input 
                type="checkbox" 
                id="active" 
                checked={formData.active} 
                onChange={(e) => setFormData({...formData, active: e.target.checked})}
                className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
              />
              <label htmlFor="active" className="text-sm font-medium text-gray-700">Active (Visible to members)</label>
            </div>
            <Button type="submit" className="md:col-span-2 bg-brand hover:bg-brand-dark">
              {editingId ? 'Update Accommodation' : 'Save Accommodation'}
            </Button>
          </form>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accommodations.map((item) => (
          <Card key={item.id} className={`overflow-hidden ${!item.active ? 'opacity-60 bg-gray-50' : ''}`}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-bold">
                 {item.name}
                 {!item.active && <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Inactive</span>}
              </CardTitle>
              <Tent className="h-5 w-5 text-brand" />
            </CardHeader>
            <CardContent>
              {item.imageUrl && (
                 <div className="mb-4 h-32 w-full relative rounded-md overflow-hidden">
                    <img src={item.imageUrl} alt={item.name} className="object-cover w-full h-full" />
                 </div>
              )}
              <div className="text-sm text-gray-500 mb-4 space-y-1">
                <p>{item.description}</p>
                <p>Capacity: {item.capacity} people</p>
                <p>Stock: {item.stock || 0} unit</p>
                <p>Price: IDR {item.price.toLocaleString()}</p>
                <p>Rating: {item.rating}/5</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setManagingAllotment(item)} title="Manage Allotment">
                  <CalendarDays className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleEditClick(item)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {managingAllotment && (
        <AllotmentManager
          accommodationId={managingAllotment.id}
          accommodationName={managingAllotment.name}
          baseStock={managingAllotment.stock || 0}
          onClose={() => setManagingAllotment(null)}
        />
      )}
    </div>
  );
}

