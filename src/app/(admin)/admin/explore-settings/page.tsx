'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Save, CheckCircle2, XCircle, Loader2, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ComparisonRow {
  name: string;
  bas: boolean;
  reg: boolean;
  ter: boolean;
}

export default function AdminExploreSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [priceBasic, setPriceBasic] = useState('');
  const [priceReguler, setPriceReguler] = useState('');
  const [priceTerusan, setPriceTerusan] = useState('');
  const [rows, setRows] = useState<ComparisonRow[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch('/api/explore-settings');
      const data = await res.json();
      setPriceBasic(data.priceBasic);
      setPriceReguler(data.priceReguler);
      setPriceTerusan(data.priceTerusan);
      setRows(JSON.parse(data.comparisonData || '[]'));
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/explore-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceBasic,
          priceReguler,
          priceTerusan,
          comparisonData: rows
        }),
      });

      if (res.ok) {
        toast.success('Pengaturan Explore berhasil disimpan');
      } else {
        throw new Error('Gagal menyimpan');
      }
    } catch (error) {
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  }

  const addRow = () => {
    setRows([...rows, { name: 'Fasilitas Baru', bas: false, reg: false, ter: true }]);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof ComparisonRow, value: any) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand" /></div>;
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 uppercase italic">Explore Hub Settings</h2>
          <p className="text-muted-foreground">Atur tabel perbandingan paket dan harga untuk Greeter Hub.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-brand hover:bg-brand/90 font-bold px-8">
          {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
          SIMPAN PERUBAHAN
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-2xl border-none shadow-lg">
          <CardHeader className="bg-gray-50/50 border-b">
            <CardTitle className="text-sm font-black text-gray-400 uppercase">Harga Paket Basic</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Input value={priceBasic} onChange={(e) => setPriceBasic(e.target.value)} placeholder="Rp 50.000" className="text-lg font-bold rounded-xl" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-none shadow-lg">
          <CardHeader className="bg-gray-50/50 border-b">
            <CardTitle className="text-sm font-black text-gray-400 uppercase">Harga Paket Reguler</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Input value={priceReguler} onChange={(e) => setPriceReguler(e.target.value)} placeholder="Rp 125.000" className="text-lg font-bold rounded-xl" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-none shadow-lg">
          <CardHeader className="bg-gray-50/50 border-b">
            <CardTitle className="text-sm font-black text-gray-400 uppercase">Harga Paket Terusan</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Input value={priceTerusan} onChange={(e) => setPriceTerusan(e.target.value)} placeholder="Rp 165.000" className="text-lg font-bold rounded-xl" />
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-none shadow-xl overflow-hidden">
        <CardHeader className="bg-gray-900 text-white p-6 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-black italic uppercase">Tabel Perbandingan Paket</CardTitle>
            <p className="text-xs text-gray-400 font-medium">Klik pada ikon untuk mengubah status centang/silang.</p>
          </div>
          <Button onClick={addRow} variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20 text-white rounded-xl">
            <Plus size={18} className="mr-2" /> Tambah Baris
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-4 px-6 text-xs font-black text-gray-400 uppercase">Nama Fasilitas / Wahana</th>
                  <th className="py-4 px-6 text-center text-xs font-black text-gray-400 uppercase">Basic</th>
                  <th className="py-4 px-6 text-center text-xs font-black text-gray-400 uppercase">Reguler</th>
                  <th className="py-4 px-6 text-center text-xs font-black text-gray-400 uppercase">Terusan</th>
                  <th className="py-4 px-6 text-right text-xs font-black text-gray-400 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <Input 
                        value={row.name} 
                        onChange={(e) => updateRow(idx, 'name', e.target.value)} 
                        className="font-bold border-none bg-transparent focus:bg-white focus:ring-1 focus:ring-brand rounded-lg px-2 h-10"
                      />
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button onClick={() => updateRow(idx, 'bas', !row.bas)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                        {row.bas ? <CheckCircle2 size={24} className="text-gray-400" /> : <XCircle size={24} className="text-gray-200" />}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button onClick={() => updateRow(idx, 'reg', !row.reg)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                        {row.reg ? <CheckCircle2 size={24} className="text-green-500" /> : <XCircle size={24} className="text-gray-200" />}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button onClick={() => updateRow(idx, 'ter', !row.ter)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                        {row.ter ? <CheckCircle2 size={24} className="text-brand" /> : <XCircle size={24} className="text-gray-200" />}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Button variant="ghost" size="icon" onClick={() => removeRow(idx)} className="text-gray-300 hover:text-red-500 hover:bg-red-50">
                        <Trash2 size={18} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
