'use client';

import { useState, useEffect, use } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, ArrowLeft, Loader2, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  imageUrl?: string;
  available: boolean;
}

export default function AdminRestaurantMenuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Main Course',
    imageUrl: '',
    available: true
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    try {
      const resRest = await fetch(`/api/restaurants/${id}`);
      const dataRest = await resRest.json();
      setRestaurant(dataRest);

      const resMenu = await fetch(`/api/restaurants/${id}/menu`);
      const dataMenu = await resMenu.json();
      if (Array.isArray(dataMenu)) {
          setMenuItems(dataMenu);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'Main Course',
      imageUrl: '',
      available: true
    });
    setIsAdding(false);
    setEditingId(null);
  }

  function handleEditClick(item: MenuItem) {
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      imageUrl: item.imageUrl || '',
      available: item.available
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
        
        if (!res.ok) throw new Error('Upload failed');
        
        const data = await res.json();
        setFormData(prev => ({ ...prev, imageUrl: data.url }));
    } catch (error) {
        console.error('Error uploading file:', error);
        alert('Failed to upload file');
    } finally {
        setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      let res;
      if (editingId) {
        res = await fetch(`/api/menu-items/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        res = await fetch(`/api/restaurants/${id}/menu`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }

      if (res.ok) {
        resetForm();
        fetchData();
      } else {
        alert('Failed to save menu item');
      }
    } catch (error) {
      console.error('Error saving menu item:', error);
    }
  }

  async function handleDelete(itemId: string) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      const res = await fetch(`/api/menu-items/${itemId}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/food')}>
            <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Menu: {restaurant?.name}
          </h2>
          <p className="text-muted-foreground">Manage menu items for this restaurant.</p>
        </div>
        <div className="ml-auto">
             <Button 
                onClick={() => {
                    if (isAdding) {
                        resetForm();
                    } else {
                        setIsAdding(true);
                    }
                }} 
            >
                {isAdding ? <><XCircle size={16} className="mr-2" /> Cancel</> : <><Plus size={16} className="mr-2" /> Add Item</>}
            </Button>
        </div>
      </div>

      {isAdding && (
        <Card className="mb-6 border-gray-200 shadow-md animate-in fade-in slide-in-from-top-4">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Menu Item' : 'Add New Menu Item'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Nasi Goreng"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <select 
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="Main Course">Main Course</option>
                    <option value="Appetizer">Appetizer</option>
                    <option value="Dessert">Dessert</option>
                    <option value="Beverage">Beverage</option>
                    <option value="Snack">Snack</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Price (IDR)</label>
                  <Input 
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    placeholder="e.g. 35000"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Original Price (Optional)</label>
                  <Input 
                    type="number"
                    value={formData.originalPrice}
                    onChange={(e) => setFormData({...formData, originalPrice: e.target.value})}
                    placeholder="e.g. 50000"
                  />
                  <p className="text-xs text-gray-500">Fill this to show a discount.</p>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Availability</label>
                    <div className="flex items-center space-x-2 mt-2">
                        <input 
                            type="checkbox" 
                            id="available" 
                            checked={formData.available} 
                            onChange={(e) => setFormData({...formData, available: e.target.checked})}
                            className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                        />
                        <label htmlFor="available" className="text-sm font-medium text-gray-700">Available</label>
                    </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Brief description"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
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
                    <div className="mt-2 relative h-32 w-32 rounded-md overflow-hidden border border-gray-200">
                        <img src={formData.imageUrl} alt="Preview" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
              <Button type="submit" className="w-full bg-brand hover:bg-brand-dark text-white">
                {editingId ? 'Update Item' : 'Save Item'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {menuItems.map((item) => (
          <Card key={item.id} className={`border-gray-200 shadow-sm hover:shadow-md transition-shadow ${!item.available ? 'opacity-60 bg-gray-50' : 'bg-white'}`}>
            <CardContent className="p-6">
              {item.imageUrl && (
                <div className="mb-4 h-40 w-full relative rounded-md overflow-hidden border border-gray-100">
                    <img src={item.imageUrl} alt={item.name} className="object-cover w-full h-full" />
                </div>
              )}
              <div className="flex justify-between items-start mb-4">
                <div>
                    <span className="text-xs font-semibold px-2 py-1 bg-brand/10 text-brand rounded-full">
                        {item.category}
                    </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)} className="h-8 w-8 text-gray-500 hover:text-blue-600">
                    <Edit2 size={16} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8 text-gray-500 hover:text-red-600">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
              
              <h3 className="font-bold text-lg mb-1">{item.name}</h3>
              <p className="text-brand font-bold mb-2">Rp {item.price.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{item.description}</p>
              
              <div className="mt-4 pt-4 border-t border-gray-100">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {item.available ? 'Available' : 'Sold Out'}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
        {menuItems.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
                No menu items found. Click "Add Item" to create one.
            </div>
        )}
      </div>
    </div>
  );
}
