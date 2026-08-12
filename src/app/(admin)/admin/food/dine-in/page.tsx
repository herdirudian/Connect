'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, QrCode } from 'lucide-react';
import QRCode from 'qrcode';

export default function AdminDineInPage() {
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [number, setNumber] = useState('');
  const [creating, setCreating] = useState(false);
  const [qrLinks, setQrLinks] = useState<Record<string, string>>({});
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [hours, setHours] = useState<{ open: string; close: string } | null>(null);
  const [savingHours, setSavingHours] = useState(false);

  useEffect(() => {
    fetchTables();
    fetchHours();
  }, []);

  async function fetchTables() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/dine-in/tables');
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

  async function fetchHours() {
    try {
      const res = await fetch('/api/admin/dine-in/hours');
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
    if (!hours) return;
    setSavingHours(true);
    try {
      const res = await fetch('/api/admin/dine-in/hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hours),
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
    if (!number.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/dine-in/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number }),
      });
      if (res.ok) {
        setNumber('');
        await fetchTables();
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
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 rounded-full border border-brand-100">
          <QrCode className="h-4 w-4 text-brand" />
          <span className="text-[11px] font-bold tracking-widest uppercase text-brand-dark">Dine In</span>
        </div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">QR Meja (Online Dine In)</h2>
      </div>

      <Card className="border border-gray-100 shadow-sm bg-white rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-black text-brand-dark uppercase tracking-tight">Buat QR Meja</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createTable} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <Label>Nomor Meja</Label>
              <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Misal: 1, 2, VIP1" />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={creating} className="w-full bg-brand text-white hover:bg-brand-dark">
                {creating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Membuat...</> : 'Generate QR'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border border-gray-100 shadow-sm bg-white rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-black text-brand-dark uppercase tracking-tight">Jam Operasional Dine In</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveHours} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Jam Buka (HH:mm)</Label>
              <Input
                value={hours?.open || ''}
                onChange={(e) => setHours(prev => ({ open: e.target.value, close: prev?.close || '' }))}
                placeholder="07:00"
              />
            </div>
            <div className="space-y-2">
              <Label>Jam Tutup (HH:mm)</Label>
              <Input
                value={hours?.close || ''}
                onChange={(e) => setHours(prev => ({ open: prev?.open || '', close: e.target.value }))}
                placeholder="22:00"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={savingHours} className="w-full bg-brand text-white hover:bg-brand-dark">
                {savingHours ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : 'Simpan Jam'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border border-gray-100 shadow-sm bg-white rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-black text-brand-dark uppercase tracking-tight">Daftar Meja</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin h-8 w-8 text-brand" />
            </div>
          ) : tables.length === 0 ? (
            <div className="text-gray-500">Belum ada meja</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tables.map((t) => (
                <Card key={t.id} className="border-2 rounded-2xl overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Meja</div>
                        <div className="font-bold text-gray-900 text-lg">{t.number}</div>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${t.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {t.active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    <div className="text-xs break-all">
                      <span className="font-bold uppercase tracking-wider text-gray-500">Link:</span>{' '}
                      {qrLinks[t.id]}
                    </div>
                    <div className="mt-3">
                      <img alt={`QR ${t.number}`} src={qrImages[t.id] || ''} className="border rounded-2xl" />
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