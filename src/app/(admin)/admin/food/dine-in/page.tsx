'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, QrCode, Utensils } from 'lucide-react';
import QRCode from 'qrcode';

export default function AdminDineInPage() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [number, setNumber] = useState('');
  const [creating, setCreating] = useState(false);
  const [qrLinks, setQrLinks] = useState<Record<string, string>>({});
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [hours, setHours] = useState<{ open: string; close: string } | null>(null);
  const [savingHours, setSavingHours] = useState(false);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchTables(selectedId);
      fetchHours(selectedId);
    } else {
      setTables([]);
      setHours(null);
    }
  }, [selectedId]);

  async function fetchRestaurants() {
    try {
      const res = await fetch('/api/restaurants');
      const data = await res.json();
      if (Array.isArray(data)) {
        setRestaurants(data);
        if (data.length > 0) setSelectedId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTables(restaurantId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/dine-in/tables?restaurantId=${restaurantId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTables(data);
        // Generate QR links
        const base = typeof window !== 'undefined' ? window.location.origin : 'https://family.thelodgegroup.id';
        const map: Record<string, string> = {};
        for (const r of data) {
          map[r.id] = `${base}/dine-in?table=${encodeURIComponent(r.slug)}`;
        }
        setQrLinks(map);
        // Generate QR images
        const imgMap: Record<string, string> = {};
        for (const r of data) {
          try {
            imgMap[r.id] = await QRCode.toDataURL(map[r.id], { margin: 1, width: 240 });
          } catch {}
        }
        setQrImages(imgMap);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchHours(restaurantId: string) {
    try {
      const res = await fetch(`/api/admin/dine-in/hours?restaurantId=${restaurantId}`);
      if (res.ok) {
        const data = await res.json();
        setHours({ open: data.open, close: data.close });
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function saveHours(e: React.FormEvent) {
    e.preventDefault();
    if (!hours || !selectedId) return;
    setSavingHours(true);
    try {
      const res = await fetch('/api/admin/dine-in/hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...hours, restaurantId: selectedId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Gagal menyimpan jam operasional');
      } else {
        alert('Jam operasional tersimpan');
      }
    } catch (e) {
      console.error(e);
      alert('Gagal menyimpan jam operasional');
    } finally {
      setSavingHours(false);
    }
  }

  async function createTable(e: React.FormEvent) {
    e.preventDefault();
    if (!number.trim() || !selectedId) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/dine-in/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number, restaurantId: selectedId }),
      });
      if (res.ok) {
        setNumber('');
        await fetchTables(selectedId);
      } else {
        const data = await res.json().catch(() => ({}));
        alert((data.error && data.details) ? `${data.error}: ${data.details}` : (data.error || 'Gagal membuat meja'));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 rounded-full border border-brand-100">
            <QrCode className="h-4 w-4 text-brand" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-brand-dark">Dine In</span>
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">QR Meja Per Outlet</h2>
        </div>

        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm w-full sm:w-64">
          <Utensils className="h-4 w-4 text-gray-400 ml-2" />
          <select 
            value={selectedId} 
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full bg-transparent border-none text-sm font-bold focus:ring-0 outline-none"
          >
            {restaurants.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-8">
          <Card className="border border-gray-100 shadow-sm bg-white rounded-2xl overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100">
              <CardTitle className="text-lg font-black text-brand-dark uppercase tracking-tight">Jam Operasional Outlet</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={saveHours} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Jam Buka (HH:mm)</Label>
                  <Input
                    value={hours?.open || ''}
                    onChange={(e) => setHours(prev => ({ open: e.target.value, close: prev?.close || '' }))}
                    placeholder="07:00"
                    className="rounded-xl border-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Jam Tutup (HH:mm)</Label>
                  <Input
                    value={hours?.close || ''}
                    onChange={(e) => setHours(prev => ({ open: prev?.open || '', close: e.target.value }))}
                    placeholder="22:00"
                    className="rounded-xl border-gray-200"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={savingHours || !selectedId} className="w-full bg-brand text-white hover:bg-brand-dark rounded-xl h-11 font-bold">
                    {savingHours ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : 'Simpan Jam Operasional'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border border-gray-100 shadow-sm bg-white rounded-2xl overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100">
              <CardTitle className="text-lg font-black text-brand-dark uppercase tracking-tight">Tambah Meja Baru</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={createTable} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Nomor Meja</Label>
                  <Input 
                    value={number} 
                    onChange={(e) => setNumber(e.target.value)} 
                    placeholder="Misal: 1, 2, VIP1" 
                    className="rounded-xl border-gray-200 h-11"
                  />
                </div>
                <Button type="submit" disabled={creating || !selectedId} className="w-full bg-brand text-white hover:bg-brand-dark rounded-xl h-11 font-bold">
                  {creating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Membuat...</> : 'Generate QR Meja'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-gray-100 shadow-sm bg-white rounded-2xl overflow-hidden h-fit">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100">
            <CardTitle className="text-lg font-black text-brand-dark uppercase tracking-tight">Daftar Meja & QR</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin h-8 w-8 text-brand" />
              </div>
            ) : tables.length === 0 ? (
              <div className="text-center py-20 text-gray-400 font-medium">
                Belum ada meja untuk outlet ini
              </div>
            ) : (
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
                {tables.map((t) => (
                  <Card key={t.id} className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-brand-50 px-3 py-1 rounded-lg">
                          <div className="text-[10px] font-black text-brand-dark/50 uppercase tracking-tighter">MEJA</div>
                          <div className="font-black text-brand-dark text-xl">{t.number}</div>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${t.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {t.active ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                      
                      <div className="mb-4 aspect-square bg-white border border-gray-50 rounded-xl overflow-hidden p-2">
                        <img alt={`QR ${t.number}`} src={qrImages[t.id] || ''} className="w-full h-full object-contain" />
                      </div>

                      <div className="space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Scan Link</div>
                        <div className="text-[10px] bg-gray-50 p-2 rounded-lg break-all font-mono text-gray-600 border border-gray-100">
                          {qrLinks[t.id]}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full h-8 text-[10px] font-black uppercase tracking-widest rounded-lg border-brand-100 text-brand hover:bg-brand-50"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = qrImages[t.id];
                            link.download = `QR-Meja-${t.number}-${selectedId}.png`;
                            link.click();
                          }}
                        >
                          Download QR
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}