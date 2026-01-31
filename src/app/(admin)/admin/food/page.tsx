'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, Utensils, XCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface Restaurant {
  id: string;
  name: string;
  type: string;
  description: string;
  status: string;
  imageUrl?: string;
  menuUrl?: string;
  active: boolean;
  allowReservations: boolean;
  allowOrders: boolean;
}

export default function AdminFoodPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    status: 'Open',
    imageUrl: '',
    menuUrl: '',
    active: true,
    allowReservations: true,
    allowOrders: true,
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  async function fetchRestaurants() {
    try {
      const res = await fetch('/api/restaurants');
      const data = await res.json();
      setRestaurants(data);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({ 
      name: '', 
      type: '', 
      description: '', 
      status: 'Open', 
      imageUrl: '', 
      menuUrl: '', 
      active: true,
      allowReservations: true,
      allowOrders: true,
    });
    setIsAdding(false);
    setEditingId(null);
  }

  function handleEditClick(item: Restaurant) {
    setFormData({
      name: item.name,
      type: item.type,
      description: item.description,
      status: item.status,
      imageUrl: item.imageUrl || '',
      menuUrl: item.menuUrl || '',
      active: item.active,
      allowReservations: item.allowReservations ?? true,
      allowOrders: item.allowOrders ?? true,
    });
    setEditingId(item.id);
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
      let res;
      if (editingId) {
        res = await fetch(`/api/restaurants/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        res = await fetch('/api/restaurants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }

      if (res.ok) {
        resetForm();
        fetchRestaurants();
      }
    } catch (error) {
      console.error('Error saving restaurant:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this restaurant?')) return;
    try {
      const res = await fetch(`/api/restaurants/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: "Deleted", description: "Restaurant deleted successfully." });
        fetchRestaurants();
      } else {
        toast({ title: "Error", description: "Failed to delete restaurant.", variant: "destructive" });
      }
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Manage Food & Beverage</h2>
          <p className="text-muted-foreground">Add or edit restaurants and cafes.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/admin/food/orders')}>
                View Orders & Reservations
            </Button>
            <Button 
              onClick={() => {
                if (isAdding) {
                    resetForm();
                } else {
                    setIsAdding(true);
                }
              }} 
            >
              {isAdding ? <><XCircle size={16} className="mr-2" /> Cancel</> : <><Plus size={16} className="mr-2" /> Add New</>}
            </Button>
        </div>
      </div>

      {isAdding && (
        <Card className="mb-6 border-gray-200 shadow-md animate-in fade-in slide-in-from-top-4">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Restaurant' : 'Add New Restaurant'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. The Lodge Coffee"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Input 
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    placeholder="e.g. Coffee Shop, Buffet"
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Brief description"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <select 
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Image</label>
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
                  <Input 
                    type="hidden"
                    value={formData.imageUrl}
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Menu URL</label>
                  <Input 
                    value={formData.menuUrl}
                    onChange={(e) => setFormData({...formData, menuUrl: e.target.value})}
                    placeholder="https://..."
                  />
                </div>
                <div className="flex flex-col space-y-3 md:col-span-2">
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
                    <div className="flex items-center space-x-2">
                        <input 
                            type="checkbox" 
                            id="allowReservations" 
                            checked={formData.allowReservations} 
                            onChange={(e) => setFormData({...formData, allowReservations: e.target.checked})}
                            className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                        />
                        <label htmlFor="allowReservations" className="text-sm font-medium text-gray-700">Allow Reservations</label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <input 
                            type="checkbox" 
                            id="allowOrders" 
                            checked={formData.allowOrders} 
                            onChange={(e) => setFormData({...formData, allowOrders: e.target.checked})}
                            className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                        />
                        <label htmlFor="allowOrders" className="text-sm font-medium text-gray-700">Allow Food Orders</label>
                    </div>
                </div>
              </div>
              <Button type="submit" className="w-full bg-brand hover:bg-brand-dark text-white">
                {editingId ? 'Update Restaurant' : 'Save Restaurant'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {restaurants.map((item) => (
          <Card key={item.id} className={`border-gray-200 shadow-sm hover:shadow-md transition-shadow ${!item.active ? 'opacity-60 bg-gray-50' : 'bg-white'}`}>
            <CardContent className="p-6">
              {item.imageUrl && (
                <div className="mb-4 h-40 w-full relative rounded-md overflow-hidden border border-gray-100">
                    <img src={item.imageUrl} alt={item.name} className="object-cover w-full h-full" />
                </div>
              )}
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-full ${item.status === 'Open' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                  <Utensils size={24} />
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/food/${item.id}`)} title="Manage Menu" className="h-8 w-8 text-gray-500 hover:text-blue-600">
                    <Utensils size={16} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)} className="h-8 w-8 text-gray-500 hover:text-blue-600">
                    <Edit2 size={16} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8 text-gray-500 hover:text-red-600">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
              
              <h3 className="font-bold text-lg mb-1">{item.name}</h3>
              <p className="text-sm text-gray-500 mb-1">{item.type}</p>
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{item.description}</p>
              
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                <span className={`text-sm font-bold ${item.status === 'Open' ? 'text-green-600' : 'text-red-600'}`}>
                  {item.status}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                    {item.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
        {restaurants.length === 0 && !loading && (
            <div className="col-span-full text-center py-12 text-gray-500">
                No restaurants found. Click "Add New" to create one.
            </div>
        )}
      </div>
    </div>
  );
}
