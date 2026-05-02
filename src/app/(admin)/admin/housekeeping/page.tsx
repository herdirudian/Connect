'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, XCircle, Edit2, Trash2 } from 'lucide-react';

type HKItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  available: boolean;
  stock?: number | null;
  active: boolean;
}

export default function AdminHousekeepingPage() {
  const [items, setItems] = useState<HKItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<HKItem>>({
    name: '',
    category: '',
    price: 0,
    available: true,
    active: true,
    stock: null
  });

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/housekeeping');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({
      name: '',
      category: '',
      price: 0,
      available: true,
      active: true,
      stock: null
    });
    setIsAdding(false);
    setEditingId(null);
  }

  function handleEdit(i: HKItem) {
    setForm({
      name: i.name,
      category: i.category,
      price: i.price,
      available: i.available,
      active: i.active,
      stock: i.stock ?? null
    });
    setEditingId(i.id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      let res;
      if (editingId) {
        res = await fetch(`/api/admin/housekeeping/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        res = await fetch('/api/admin/housekeeping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      if (res.ok) {
        resetForm();
        fetchItems();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Gagal menyimpan item');
      }
    } catch (e) {
      alert('Gagal menyimpan item');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus item housekeeping ini?')) return;
    try {
      const res = await fetch(`/api/admin/housekeeping/${id}`, { method: 'DELETE' });
      if (res.ok) fetchItems();
    } catch (e) {}
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Manage Housekeeping Catalog</h2>
          <p className="text-muted-foreground">Tambahkan/hapus/ubah item housekeeping.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setIsAdding((v) => !v)}
          >
            {isAdding ? <><XCircle size={16} className="mr-2" /> Cancel</> : <><Plus size={16} className="mr-2" /> Add Item</>}
          </Button>
        </div>
      </div>

      {isAdding && (
        <Card className="mb-6 border-gray-200 shadow-md">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Item' : 'Add New Item'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Nama</Label>
                <Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <Label>Kategori</Label>
                <Input value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
              </div>
              <div>
                <Label>Harga</Label>
                <Input type="number" value={form.price || 0} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value || '0') })} required />
              </div>
              <div>
                <Label>Stok (opsional)</Label>
                <Input type="number" value={form.stock ?? ''} onChange={(e) => setForm({ ...form, stock: e.target.value ? parseInt(e.target.value, 10) : null })} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.available ?? true} onChange={(e) => setForm({ ...form, available: e.target.checked })} />
                <Label>Tersedia</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.active ?? true} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                <Label>Aktif</Label>
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit">Simpan</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Daftar Item</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin h-8 w-8 text-brand" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-gray-500">Belum ada item</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((i) => (
                <Card key={i.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold">{i.name}</div>
                        <div className="text-xs text-gray-500 uppercase">{i.category}</div>
                      </div>
                      <div className="font-bold">Rp {i.price.toLocaleString()}</div>
                    </div>
                    <div className="text-xs mt-1 text-gray-600">
                      <span className={`px-2 py-1 rounded-full ${i.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{i.available ? 'Tersedia' : 'Tidak Tersedia'}</span>
                      <span className="ml-2">Stok: {i.stock ?? '-'}</span>
                      <span className="ml-2">{i.active ? 'Aktif' : 'Nonaktif'}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(i)}><Edit2 className="h-4 w-4 mr-1" /> Edit</Button>
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200" onClick={() => handleDelete(i.id)}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
