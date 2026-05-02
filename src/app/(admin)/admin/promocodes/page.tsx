'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Percent, Gift, Loader2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PromoCode {
  id: string;
  code: string;
  description?: string | null;
  discountType: string;
  value: number;
  maxDiscount?: number | null;
  minAmount?: number | null;
  applicableTo: string;
  active: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
  usageLimit?: number | null;
  usedCount: number;
  createdAt: string;
  updatedAt: string;
}

interface PromoUsageBooking {
  id: string;
  date: string;
  type: string;
  amount: number;
  status: string;
  paymentStatus: string;
  userName: string;
  userEmail: string;
  items?: string;
  discount?: number;
}

export default function AdminPromoCodesPage() {
  const { toast } = useToast();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageBookings, setUsageBookings] = useState<PromoUsageBooking[]>([]);
  const [usageForCode, setUsageForCode] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'PERCENT',
    value: '',
    maxDiscount: '',
    minAmount: '',
    applicableTo: 'ALL',
    validFrom: '',
    validUntil: '',
    active: true,
    usageLimit: '',
  });

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  async function fetchPromoCodes() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/promocodes');
      const data = await res.json();
      setPromoCodes(data || []);
    } catch (error) {
      console.error('Error fetching promo codes:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat promo codes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      code: '',
      description: '',
      discountType: 'PERCENT',
      value: '',
      maxDiscount: '',
      minAmount: '',
      applicableTo: 'ALL',
      validFrom: '',
      validUntil: '',
      active: true,
      usageLimit: '',
    });
    setIsAdding(false);
    setEditingId(null);
  }

  function handleEditClick(promo: PromoCode) {
    setFormData({
      code: promo.code,
      description: promo.description || '',
      discountType: promo.discountType,
      value: String(promo.value),
      maxDiscount: promo.maxDiscount != null ? String(promo.maxDiscount) : '',
      minAmount: promo.minAmount != null ? String(promo.minAmount) : '',
      applicableTo: promo.applicableTo || 'ALL',
      validFrom: promo.validFrom ? promo.validFrom.substring(0, 10) : '',
      validUntil: promo.validUntil ? promo.validUntil.substring(0, 10) : '',
      active: promo.active,
      usageLimit: promo.usageLimit != null ? String(promo.usageLimit) : '',
    });
    setEditingId(promo.id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        code: formData.code.trim().toUpperCase(),
        description: formData.description || undefined,
        discountType: formData.discountType,
        value: formData.value ? Number(formData.value) : undefined,
        maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : null,
        minAmount: formData.minAmount ? Number(formData.minAmount) : null,
        applicableTo: formData.applicableTo,
        validFrom: formData.validFrom || null,
        validUntil: formData.validUntil || null,
        active: formData.active,
        usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
      };

      let res: Response;
      if (editingId) {
        res = await fetch('/api/admin/promocodes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload }),
        });
      } else {
        res = await fetch('/api/admin/promocodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan promo code');
      }

      toast({
        title: 'Berhasil',
        description: `Promo code ${editingId ? 'diperbarui' : 'ditambahkan'} dengan sukses.`,
      });
      resetForm();
      fetchPromoCodes();
    } catch (error: any) {
      console.error('Error saving promo code:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal menyimpan promo code.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Yakin ingin menghapus promo code ini?')) return;
    try {
      const res = await fetch('/api/admin/promocodes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus promo code');
      }
      toast({
        title: 'Berhasil',
        description: 'Promo code berhasil dihapus.',
      });
      fetchPromoCodes();
    } catch (error: any) {
      console.error('Error deleting promo code:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus promo code.',
        variant: 'destructive',
      });
    }
  }

  async function handleViewUsage(promo: PromoCode) {
    if (usageForCode === promo.code && usageBookings.length > 0) {
      setUsageForCode(null);
      setUsageBookings([]);
      return;
    }

    setUsageLoading(true);
    setUsageForCode(promo.code);
    try {
      const res = await fetch(
        `/api/admin/promocodes/usage?code=${encodeURIComponent(promo.code)}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memuat data penggunaan');
      }
      setUsageBookings((data.bookings || []) as PromoUsageBooking[]);
    } catch (error: any) {
      console.error('Error fetching promo usage:', error);
      setUsageBookings([]);
      toast({
        title: 'Error',
        description: error.message || 'Gagal memuat data penggunaan.',
        variant: 'destructive',
      });
    } finally {
      setUsageLoading(false);
    }
  }

  async function handleToggleActive(promo: PromoCode) {
    try {
      const res = await fetch('/api/admin/promocodes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: promo.id, active: !promo.active }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memperbarui status promo');
      }
      toast({
        title: 'Berhasil',
        description: `Promo code ${promo.code} kini ${data.active ? 'aktif' : 'nonaktif'}.`,
      });
      setPromoCodes((prev) =>
        prev.map((p) => (p.id === promo.id ? { ...p, active: data.active } : p))
      );
    } catch (error: any) {
      console.error('Error toggling active:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal memperbarui status promo.',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Promo Codes</h2>
          <p className="text-muted-foreground">
            Kelola kode voucher/promo untuk tiket dan penginapan.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
          <Button
            onClick={() => {
              if (isAdding) {
                resetForm();
              } else {
                setIsAdding(true);
              }
            }}
            className="w-full sm:w-auto"
          >
            {isAdding ? (
              <>
                <XCircle size={16} className="mr-2" /> Batal
              </>
            ) : (
              <>
                <Plus size={16} className="mr-2" /> Tambah Promo Code
              </>
            )}
          </Button>
        </div>
      </div>

      {isAdding && (
        <Card className="mb-6 border-gray-200 shadow-md animate-in fade-in slide-in-from-top-4">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Promo Code' : 'Tambah Promo Code'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Kode</label>
                  <Input
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g. GLAMP20"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipe Diskon</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={formData.discountType}
                    onChange={(e) =>
                      setFormData({ ...formData, discountType: e.target.value })
                    }
                  >
                    <option value="PERCENT">Persen (%)</option>
                    <option value="FIXED">Nominal (Rp)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Nilai Diskon {formData.discountType === 'PERCENT' ? '(%)' : '(Rp)'}
                  </label>
                  <Input
                    type="number"
                    value={formData.value}
                    onChange={(e) =>
                      setFormData({ ...formData, value: e.target.value })
                    }
                    placeholder={formData.discountType === 'PERCENT' ? 'e.g. 20' : 'e.g. 50000'}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Diskon Maksimal (Rp)</label>
                  <Input
                    type="number"
                    value={formData.maxDiscount}
                    onChange={(e) =>
                      setFormData({ ...formData, maxDiscount: e.target.value })
                    }
                    placeholder="Opsional"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Minimal Transaksi (Rp)</label>
                  <Input
                    type="number"
                    value={formData.minAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, minAmount: e.target.value })
                    }
                    placeholder="Opsional"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Berlaku Untuk</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={formData.applicableTo}
                    onChange={(e) =>
                      setFormData({ ...formData, applicableTo: e.target.value })
                    }
                  >
                    <option value="ALL">Semua Booking</option>
                    <option value="WAHANA">Tiket Wahana</option>
                    <option value="GLAMPING">Penginapan/Glamping</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tanggal Mulai</label>
                  <Input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) =>
                      setFormData({ ...formData, validFrom: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tanggal Berakhir</label>
                  <Input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) =>
                      setFormData({ ...formData, validUntil: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Batas Pemakaian (per kode)</label>
                  <Input
                    type="number"
                    value={formData.usageLimit}
                    onChange={(e) =>
                      setFormData({ ...formData, usageLimit: e.target.value })
                    }
                    placeholder="Opsional"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Deskripsi</label>
                  <Input
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Deskripsi singkat untuk internal / admin"
                  />
                </div>
                <div className="flex items-center space-x-2 md:col-span-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) =>
                      setFormData({ ...formData, active: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                  />
                  <label htmlFor="active" className="text-sm font-medium text-gray-700">
                    Aktif
                  </label>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-brand hover:bg-brand-dark text-white"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : editingId ? (
                  'Update Promo Code'
                ) : (
                  'Simpan Promo Code'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-brand" />
            Daftar Promo Codes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : promoCodes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Belum ada promo code. Klik &quot;Tambah Promo Code&quot; untuk membuat.
            </div>
          ) : (
            <div className="space-y-3">
              {promoCodes.map((promo) => {
                const isUsageOpen = usageForCode === promo.code;
                const totalUsage = isUsageOpen ? usageBookings.length : null;

                return (
                  <div key={promo.id} className="border rounded-lg">
                    <div
                      className={`flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 ${
                        promo.active ? 'bg-white' : 'bg-gray-50 opacity-80'
                      }`}
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={promo.active ? 'default' : 'outline'}
                            className={`text-xs font-bold ${
                              promo.active
                                ? 'bg-brand text-white'
                                : 'border-gray-300 text-gray-600'
                            }`}
                          >
                            {promo.code}
                          </Badge>
                          <span className="text-sm text-gray-700 font-semibold">
                            {promo.discountType === 'PERCENT'
                              ? `${promo.value}%`
                              : new Intl.NumberFormat('id-ID', {
                                  style: 'currency',
                                  currency: 'IDR',
                                  maximumFractionDigits: 0,
                                }).format(promo.value)}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({promo.applicableTo === 'ALL'
                              ? 'Semua Booking'
                              : promo.applicableTo === 'WAHANA'
                              ? 'Tiket Wahana'
                              : 'Penginapan/Glamping'})
                          </span>
                          {promo.minAmount != null && (
                            <span className="text-xs text-gray-500">
                              Min:{' '}
                              {new Intl.NumberFormat('id-ID', {
                                style: 'currency',
                                currency: 'IDR',
                                maximumFractionDigits: 0,
                              }).format(promo.minAmount)}
                            </span>
                          )}
                          {promo.maxDiscount != null && (
                            <span className="text-xs text-gray-500">
                              Max Diskon:{' '}
                              {new Intl.NumberFormat('id-ID', {
                                style: 'currency',
                                currency: 'IDR',
                                maximumFractionDigits: 0,
                              }).format(promo.maxDiscount)}
                            </span>
                          )}
                        </div>
                        {promo.description && (
                          <p className="text-xs text-gray-500 line-clamp-2">
                            {promo.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 mt-1">
                          {promo.validFrom && (
                            <span>
                              Mulai:{' '}
                              {new Date(promo.validFrom).toLocaleDateString('id-ID')}
                            </span>
                          )}
                          {promo.validUntil && (
                            <span>
                              Selesai:{' '}
                              {new Date(promo.validUntil).toLocaleDateString('id-ID')}
                            </span>
                          )}
                          <span>
                            Terpakai: {promo.usedCount}
                            {promo.usageLimit != null && ` / ${promo.usageLimit}`}
                          </span>
                          {isUsageOpen && (
                            <span>
                              Jumlah penggunaan (booking): {totalUsage}
                            </span>
                          )}
                          <span>
                            Status:{' '}
                            <strong
                              className={promo.active ? 'text-green-600' : 'text-gray-600'}
                            >
                              {promo.active ? 'Aktif' : 'Nonaktif'}
                            </strong>
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 md:ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewUsage(promo)}
                        >
                          {usageLoading && isUsageOpen ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Memuat...
                            </>
                          ) : isUsageOpen ? (
                            'Tutup Data Pembelian'
                          ) : (
                            'Lihat Data Pembelian'
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(promo)}
                          className={promo.active ? 'border-green-500 text-green-600' : ''}
                        >
                          <Percent className="h-4 w-4 mr-1" />
                          {promo.active ? 'Nonaktifkan' : 'Aktifkan'}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditClick(promo)}
                          className="text-gray-600 hover:text-blue-600"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(promo.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {isUsageOpen && (
                      <div className="border-t bg-gray-50 px-4 py-3 text-xs text-gray-700">
                        {usageLoading ? (
                          <div className="flex items-center gap-2 text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Memuat data pembelian...
                          </div>
                        ) : usageBookings.length === 0 ? (
                          <div className="text-gray-500">
                            Belum ada booking yang menggunakan kode ini.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold">
                                Total penggunaan: {usageBookings.length} booking
                              </span>
                              <span>
                                Total nilai booking:{' '}
                                {new Intl.NumberFormat('id-ID', {
                                  style: 'currency',
                                  currency: 'IDR',
                                  maximumFractionDigits: 0,
                                }).format(
                                  usageBookings.reduce(
                                    (sum, b) => sum + (b.amount || 0),
                                    0
                                  )
                                )}
                              </span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-[11px]">
                                <thead>
                                  <tr className="text-left text-gray-500">
                                    <th className="py-1 pr-3">Booking ID</th>
                                    <th className="py-1 pr-3">Tanggal</th>
                                    <th className="py-1 pr-3">Tipe</th>
                                    <th className="py-1 pr-3">Item (Qty)</th>
                                    <th className="py-1 pr-3">User</th>
                                    <th className="py-1 pr-3">Email</th>
                                    <th className="py-1 pr-3">Status</th>
                                    <th className="py-1 pr-3 text-right">Diskon</th>
                                    <th className="py-1 pr-3 text-right">Jumlah</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {usageBookings.map((b) => (
                                    <tr key={b.id} className="border-t border-gray-200">
                                      <td className="py-1 pr-3 font-mono text-[10px]">
                                        {b.id}
                                      </td>
                                      <td className="py-1 pr-3">
                                        {new Date(b.date).toLocaleString('id-ID')}
                                      </td>
                                      <td className="py-1 pr-3">{b.type}</td>
                                      <td className="py-1 pr-3 max-w-[200px] truncate" title={b.items}>
                                        {b.items || '-'}
                                      </td>
                                      <td className="py-1 pr-3">{b.userName}</td>
                                      <td className="py-1 pr-3">{b.userEmail}</td>
                                      <td className="py-1 pr-3">
                                        {b.paymentStatus || b.status}
                                      </td>
                                      <td className="py-1 pr-3 text-right text-green-600">
                                        {b.discount ? new Intl.NumberFormat('id-ID', {
                                          style: 'currency',
                                          currency: 'IDR',
                                          maximumFractionDigits: 0,
                                        }).format(b.discount) : '-'}
                                      </td>
                                      <td className="py-1 pr-3 text-right">
                                        {new Intl.NumberFormat('id-ID', {
                                          style: 'currency',
                                          currency: 'IDR',
                                          maximumFractionDigits: 0,
                                        }).format(b.amount)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
