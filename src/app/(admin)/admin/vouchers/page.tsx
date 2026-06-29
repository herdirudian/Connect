'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Ticket, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Filter,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  Users
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Voucher {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  city: string;
  visitDate: string;
  visitorCount: string;
  voucherCode: string;
  isUsed: boolean;
  claimedAt: string;
}

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'AVAILABLE' | 'USED'>('ALL');
  const [redeemLoading, setRedeemLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchVouchers();
  }, []);

  async function fetchVouchers() {
    try {
      const res = await fetch('/api/admin/vouchers');
      const data = await res.json();
      setVouchers(data);
    } catch (error) {
      console.error('Error fetching vouchers:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengambil data voucher',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRedeem(voucherCode: string) {
    if (!confirm(`Redeem voucher ${voucherCode}? Tindakan ini tidak dapat dibatalkan.`)) return;
    
    setRedeemLoading(voucherCode);
    try {
      const res = await fetch('/api/admin/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voucherCode }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast({
          title: 'Berhasil',
          description: 'Voucher telah berhasil di-redeem.',
        });
        fetchVouchers();
      } else {
        toast({
          title: 'Gagal',
          description: data.error || 'Gagal redeem voucher',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan koneksi',
        variant: 'destructive',
      });
    } finally {
      setRedeemLoading(null);
    }
  }

  const filteredVouchers = vouchers.filter(v => {
    const matchesSearch = 
      v.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      v.voucherCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.phoneNumber.includes(searchQuery);
    
    const matchesStatus = 
      filterStatus === 'ALL' || 
      (filterStatus === 'AVAILABLE' && !v.isUsed) || 
      (filterStatus === 'USED' && v.isUsed);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 uppercase italic">Voucher Klaim Diskon 20%</h2>
        <p className="text-muted-foreground">Monitor tamu yang melakukan klaim voucher dan lakukan redeem saat voucher digunakan.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-brand text-white border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-brand-100">Total Klaim</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black">{vouchers.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-600 text-white border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-green-100">Belum Digunakan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black">{vouchers.filter(v => !v.isUsed).length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 text-white border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-gray-400">Sudah Redeemed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black">{vouchers.filter(v => v.isUsed).length}</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500 text-white border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-yellow-100">Redeem Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black">
              {vouchers.length > 0 ? Math.round((vouchers.filter(v => v.isUsed).length / vouchers.length) * 100) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input 
            placeholder="Cari Nama, Kode, atau WA..." 
            className="pl-10 h-12 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(['ALL', 'AVAILABLE', 'USED'] as const).map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? 'primary' : 'outline'}
              onClick={() => setFilterStatus(status)}
              className="h-12 rounded-xl px-6 font-bold"
            >
              {status === 'ALL' ? 'Semua' : status === 'AVAILABLE' ? 'Belum Digunakan' : 'Sudah Digunakan'}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-brand h-12 w-12" />
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredVouchers.map((v) => (
            <Card key={v.id} className={`overflow-hidden border-none shadow-md transition-all hover:shadow-xl ${v.isUsed ? 'bg-gray-50 opacity-75' : 'bg-white'}`}>
              <div className={`h-2 w-full ${v.isUsed ? 'bg-gray-300' : 'bg-brand'}`} />
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <Badge variant={v.isUsed ? 'secondary' : 'default'} className={`mb-2 ${!v.isUsed ? 'bg-brand' : ''}`}>
                      {v.isUsed ? 'REDEEMED' : 'AVAILABLE'}
                    </Badge>
                    <h3 className="text-xl font-black text-brand tracking-widest">{v.voucherCode}</h3>
                  </div>
                  <div className={`p-3 rounded-2xl ${v.isUsed ? 'bg-gray-200 text-gray-400' : 'bg-brand/10 text-brand'}`}>
                    <Ticket size={24} />
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3">
                    <User size={16} className="text-gray-400" />
                    <p className="text-sm font-bold text-gray-900">{v.fullName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone size={16} className="text-gray-400" />
                    <p className="text-sm font-medium text-gray-600">{v.phoneNumber}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-gray-400" />
                    <p className="text-sm font-medium text-gray-600">{v.email}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Kota</p>
                      <div className="flex items-center gap-1">
                        <MapPin size={12} className="text-brand" />
                        <p className="text-xs font-bold">{v.city}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tgl Rencana</p>
                      <div className="flex items-center gap-1">
                        <Calendar size={12} className="text-brand" />
                        <p className="text-xs font-bold">{formatDate(v.visitDate)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Users size={14} className="text-gray-400" />
                    <p className="text-[11px] font-bold text-gray-500">Rombongan: {v.visitorCount}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-medium">Diklaim: {formatDate(v.claimedAt)}</span>
                  {!v.isUsed ? (
                    <Button 
                      onClick={() => handleRedeem(v.voucherCode)}
                      disabled={redeemLoading === v.voucherCode}
                      className="bg-brand hover:bg-brand/90 text-white font-bold rounded-xl h-10 px-6"
                    >
                      {redeemLoading === v.voucherCode ? <Loader2 size={16} className="animate-spin" /> : 'REDEEM'}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1 text-green-600 font-black italic text-xs">
                      <CheckCircle2 size={14} /> REDEEMED
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredVouchers.length === 0 && (
        <div className="text-center py-20 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200">
          <XCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900">Tidak ada data voucher</h3>
          <p className="text-gray-500">Sesuaikan filter atau pencarian Anda.</p>
        </div>
      )}
    </div>
  );
}
