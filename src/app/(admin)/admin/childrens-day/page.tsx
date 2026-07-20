'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2, Edit2, Trash2, Ticket, Users, RefreshCw, Settings, CalendarDays, Download } from 'lucide-react';

export default function AdminChildrensDayPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [maxQuota, setMaxQuota] = useState(3000);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('ALL');
  
  const [editItem, setEditItem] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Quota Settings state
  const [isQuotaDialogOpen, setIsQuotaDialogOpen] = useState(false);
  const [tempQuota, setTempQuota] = useState(3000);
  const [isSavingQuota, setIsSavingQuota] = useState(false);

  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/childrens-day');
      const json = await res.json();
      if (res.ok) {
        setData(json.registrations);
        setCount(json.count);
        setMaxQuota(json.maxQuota);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEditClick = (item: any) => {
    setEditItem({ ...item });
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editItem) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/childrens-day/${editItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editItem)
      });
      if (!res.ok) throw new Error('Gagal menyimpan data');
      
      toast({ title: 'Berhasil', description: 'Data pendaftar berhasil diperbarui' });
      setIsEditDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini secara permanen?')) return;
    try {
      const res = await fetch(`/api/admin/childrens-day/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus data');
      toast({ title: 'Berhasil', description: 'Data berhasil dihapus' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleSaveQuota = async () => {
    setIsSavingQuota(true);
    try {
      const res = await fetch('/api/admin/childrens-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxQuota: parseInt(tempQuota.toString(), 10) })
      });
      if (!res.ok) throw new Error('Gagal menyimpan kuota');
      
      toast({ title: 'Berhasil', description: 'Kuota berhasil diperbarui' });
      setIsQuotaDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSavingQuota(false);
    }
  };

  const filteredData = data.filter(d => {
    const matchesSearch = d.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.childName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.parentPhone.includes(searchTerm) ||
      d.parentEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = filterDate === 'ALL' || d.visitDate === filterDate;
    
    return matchesSearch && matchesDate;
  });

  // Calculate Date Summaries
  const dateSummaries = data.reduce((acc: any, curr: any) => {
    acc[curr.visitDate] = (acc[curr.visitDate] || 0) + 1;
    return acc;
  }, {});

  const handleExportCSV = () => {
    const headers = ['ID', 'Tanggal Daftar', 'Nama Orang Tua', 'No WhatsApp', 'Email', 'Kota Domisili', 'Nama Anak', 'Usia Anak', 'Tanggal Kunjungan', 'Status'];
    const csvRows = [headers.join(',')];

    filteredData.forEach(item => {
      const row = [
        item.id,
        new Date(item.createdAt).toLocaleDateString('id-ID'),
        `"${item.parentName}"`,
        `"${item.parentPhone || ''}"`,
        `"${item.parentEmail}"`,
        `"${item.parentCity}"`,
        `"${item.childName}"`,
        item.childAge,
        item.visitDate,
        item.isUsed ? 'USED' : 'ACTIVE'
      ];
      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `data_pendaftar_harianak_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Promo Hari Anak Nasional</h2>
          <p className="text-muted-foreground">Manajemen pendaftar tiket gratis Hari Anak Nasional.</p>
        </div>
        <Button onClick={fetchData} variant="outline" className="gap-2">
          <RefreshCw size={16} /> Refresh Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-brand text-white border-none shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-brand-50 text-sm font-medium mb-1">Total Pendaftar</p>
                <h3 className="text-4xl font-black">{count}</h3>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <Users size={32} className="text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-500 text-white border-none shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium mb-1">Sisa Kuota</p>
                <h3 className="text-4xl font-black">{Math.max(0, maxQuota - count)} <span className="text-sm font-normal text-orange-200">/ {maxQuota}</span></h3>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <div className="bg-white/20 p-2 rounded-xl mb-1">
                  <Ticket size={24} className="text-white" />
                </div>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  className="bg-white/20 hover:bg-white/30 text-white border-none h-8 text-xs"
                  onClick={() => {
                    setTempQuota(maxQuota);
                    setIsQuotaDialogOpen(true);
                  }}
                >
                  <Settings size={14} className="mr-1" /> Edit Kuota
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border shadow-sm">
          <CardContent className="p-4 flex flex-col h-full justify-center">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="text-brand w-5 h-5" />
              <h4 className="font-bold text-gray-800 text-sm">Ringkasan per Tanggal</h4>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-50 p-2 rounded border">
                <span className="text-gray-500 block">23 Jul:</span>
                <span className="font-bold text-lg">{dateSummaries['2026-07-23'] || 0}</span>
              </div>
              <div className="bg-gray-50 p-2 rounded border">
                <span className="text-gray-500 block">24 Jul:</span>
                <span className="font-bold text-lg">{dateSummaries['2026-07-24'] || 0}</span>
              </div>
              <div className="bg-gray-50 p-2 rounded border">
                <span className="text-gray-500 block">25 Jul:</span>
                <span className="font-bold text-lg">{dateSummaries['2026-07-25'] || 0}</span>
              </div>
              <div className="bg-gray-50 p-2 rounded border">
                <span className="text-gray-500 block">26 Jul:</span>
                <span className="font-bold text-lg">{dateSummaries['2026-07-26'] || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle>Daftar Peserta</CardTitle>
              <CardDescription>Semua pendaftar tiket promo gratis.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                className="flex h-10 w-full sm:w-48 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              >
                <option value="ALL">Semua Tanggal</option>
                <option value="2026-07-23">23 Juli 2026</option>
                <option value="2026-07-24">24 Juli 2026</option>
                <option value="2026-07-25">25 Juli 2026</option>
                <option value="2026-07-26">26 Juli 2026</option>
              </select>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Cari nama, email, no HP..." 
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button onClick={handleExportCSV} variant="outline" className="gap-2 bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800">
                <Download size={16} /> Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 bg-gray-50 uppercase">
                <tr>
                  <th className="px-4 py-3">ID / Tanggal Daftar</th>
                  <th className="px-4 py-3">Orang Tua</th>
                  <th className="px-4 py-3">Anak</th>
                  <th className="px-4 py-3">Tanggal Kunjungan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-8"><Loader2 className="animate-spin h-6 w-6 mx-auto text-brand" /></td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-500">Tidak ada data ditemukan</td></tr>
                ) : (
                  filteredData.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-gray-500">{item.id.substring(0, 8)}...</div>
                        <div className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString('id-ID')}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold">{item.parentName}</div>
                        <div className="text-xs text-gray-500">{item.parentPhone}</div>
                        <div className="text-xs text-gray-500">{item.parentEmail}</div>
                        <div className="text-xs text-gray-500 mt-1">{item.parentCity}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold">{item.childName}</div>
                        <div className="text-xs text-gray-500">{item.childAge} Tahun</div>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {item.visitDate}
                      </td>
                      <td className="px-4 py-3">
                        {item.isUsed ? (
                          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">USED</span>
                        ) : (
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">ACTIVE</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)}>
                          <Edit2 size={16} className="text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                          <Trash2 size={16} className="text-red-600" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Data Pendaftar</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Nama Orang Tua</Label>
                <Input value={editItem.parentName} onChange={(e) => setEditItem({...editItem, parentName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>No WhatsApp</Label>
                <Input value={editItem.parentPhone} onChange={(e) => setEditItem({...editItem, parentPhone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editItem.parentEmail} onChange={(e) => setEditItem({...editItem, parentEmail: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Kota Domisili</Label>
                <Input value={editItem.parentCity} onChange={(e) => setEditItem({...editItem, parentCity: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Nama Anak</Label>
                <Input value={editItem.childName} onChange={(e) => setEditItem({...editItem, childName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Usia Anak</Label>
                <Input type="number" value={editItem.childAge} onChange={(e) => setEditItem({...editItem, childAge: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Kunjungan</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background"
                  value={editItem.visitDate}
                  onChange={(e) => setEditItem({...editItem, visitDate: e.target.value})}
                >
                  <option value="2026-07-23">2026-07-23</option>
                  <option value="2026-07-24">2026-07-24</option>
                  <option value="2026-07-25">2026-07-25</option>
                  <option value="2026-07-26">2026-07-26</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Status Voucher</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background"
                  value={editItem.isUsed ? "true" : "false"}
                  onChange={(e) => setEditItem({...editItem, isUsed: e.target.value === "true"})}
                >
                  <option value="false">ACTIVE (Belum Dipakai)</option>
                  <option value="true">USED (Sudah Dipakai)</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-brand hover:bg-brand-dark">
              {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quota Settings Dialog */}
      <Dialog open={isQuotaDialogOpen} onOpenChange={setIsQuotaDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Pengaturan Kuota Promo</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Maksimal Pendaftar</Label>
              <Input 
                type="number" 
                min="0"
                value={tempQuota} 
                onChange={(e) => setTempQuota(parseInt(e.target.value) || 0)} 
                className="h-12 text-lg font-bold"
              />
              <p className="text-xs text-gray-500">Ubah nilai ini untuk membatasi atau membuka kembali pendaftaran.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQuotaDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSaveQuota} disabled={isSavingQuota} className="bg-orange-500 hover:bg-orange-600 text-white">
              {isSavingQuota ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null} Simpan Kuota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
