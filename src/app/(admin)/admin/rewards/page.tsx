'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Gift, Edit2, Trash2, Plus, XCircle, Upload, History } from 'lucide-react';

interface Reward {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: string;
  imageUrl?: string;
  active: boolean;
}

export default function AdminRewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cost: '',
    type: 'VOUCHER',
    imageUrl: '',
    active: true,
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchRewards();
  }, []);

  async function fetchRewards() {
    try {
      const res = await fetch('/api/rewards');
      const data = await res.json();
      setRewards(data);
    } catch (error) {
      console.error('Error fetching rewards:', error);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({ name: '', description: '', cost: '', type: 'VOUCHER', imageUrl: '', active: true });
    setIsAdding(false);
    setEditingId(null);
  }

  function handleEditClick(item: Reward) {
    setFormData({
      name: item.name,
      description: item.description,
      cost: item.cost.toString(),
      type: item.type,
      imageUrl: item.imageUrl || '',
      active: item.active,
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
      const payload = {
        ...formData,
        cost: parseInt(formData.cost, 10),
      };

      let res;
      if (editingId) {
        res = await fetch(`/api/rewards/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/rewards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        resetForm();
        fetchRewards();
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save reward');
      }
    } catch (error) {
      console.error('Error saving reward:', error);
      alert(error instanceof Error ? error.message : 'Failed to save reward');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this reward?')) return;
    try {
      const res = await fetch(`/api/rewards/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchRewards();
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete reward');
      }
    } catch (error) {
      console.error('Error deleting reward:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete reward');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Manajemen Rewards</h2>
          <p className="text-gray-500">Buat voucher dan atur penukaran poin.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <Link href="/admin/rewards/history" className="w-full sm:w-auto">
                <Button variant="outline" className="flex items-center gap-2 w-full sm:w-auto">
                    <History size={16} />
                    Riwayat Redeem
                </Button>
            </Link>
            <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2 w-full sm:w-auto">
            <Plus size={16} />
            Tambah Reward
            </Button>
        </div>
      </div>

      {isAdding && (
        <Card className="mb-6 border-gray-200 shadow-md animate-in fade-in slide-in-from-top-4">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Reward' : 'Add New Reward'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cost (points)</label>
                  <Input 
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData({...formData, cost: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    required
                  >
                    <option value="VOUCHER">Voucher</option>
                    <option value="MERCH">Merchandise</option>
                    <option value="TICKET">Ticket</option>
                    <option value="BIRTHDAY">Birthday Perk</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Image</label>
                  <div className="flex gap-2">
                    <Input 
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                      placeholder="https://... or upload image"
                    />
                    <div className="relative">
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                      <label 
                        htmlFor="file-upload" 
                        className={`flex items-center justify-center px-4 py-2 border rounded-md cursor-pointer hover:bg-gray-50 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Upload size={16} className="text-gray-600" />
                      </label>
                    </div>
                  </div>
                  {formData.imageUrl && (
                    <div className="mt-2 relative w-full h-40 bg-gray-100 rounded-md overflow-hidden">
                       {/* eslint-disable-next-line @next/next/no-img-element */}
                       <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    required
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
                {editingId ? 'Update Reward' : 'Save Reward'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {rewards.map((item) => (
          <Card key={item.id} className={`border-gray-200 shadow-sm hover:shadow-md transition-shadow ${!item.active ? 'opacity-60 bg-gray-50' : 'bg-white'}`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-full ${item.active ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-400'}`}>
                  <Gift size={24} />
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
              <p className="text-sm text-gray-500 mb-3">{item.description}</p>
              
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                <span className="font-bold text-brand-dark">
                  {item.cost} pts
                </span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                    {item.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
        {rewards.length === 0 && !loading && (
            <div className="col-span-full text-center py-12 text-gray-500">
                No rewards found. Click "Add New" to create one.
            </div>
        )}
      </div>
    </div>
  );
}
