'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Zap, 
  CheckCircle2, 
  Loader2, 
  X,
  Info,
  ChevronRight,
  Gift
} from 'lucide-react';
import Link from 'next/link';

export default function PublicVoucherClaimPage() {
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);
  const [voucherForm, setVoucherForm] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    city: '',
    visitDate: '',
    visitorCount: '1 org'
  });

  const handleVoucherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimLoading(true);
    try {
      const res = await fetch('/api/vouchers/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voucherForm)
      });
      const data = await res.json();
      if (res.ok) {
        setClaimSuccess(data.voucherCode);
        setVoucherForm({
          fullName: '',
          phoneNumber: '',
          email: '',
          city: '',
          visitDate: '',
          visitorCount: '1 org'
        });
      } else {
        alert(data.error || 'Gagal klaim voucher');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi');
    } finally {
      setClaimLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 md:p-8">
      <div className="max-w-4xl w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <Link href="/">
            <img src="/logotlm.png" alt="The Lodge Maribaya" className="h-12 mx-auto mb-4" />
          </Link>
          <h1 className="text-2xl font-black text-brand uppercase tracking-tighter italic">E-Voucher Rewards</h1>
        </div>

        <Card className="rounded-[40px] overflow-hidden border-none shadow-2xl bg-white">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row min-h-[600px]">
              {/* Left Side: T&C and Info */}
              <div className="w-full md:w-5/12 bg-brand p-8 md:p-12 text-white flex flex-col justify-between">
                <div>
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-8">
                    <Gift className="text-white" size={32} />
                  </div>
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none mb-4">
                    DISKON<br />
                    <span className="text-yellow-400">20%</span>
                  </h2>
                  <p className="text-sm text-brand-50 font-bold mb-8 leading-relaxed">
                    Khusus untuk kunjungan Anda berikutnya di The Lodge Maribaya.
                  </p>
                  
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="h-px bg-white/30 flex-1" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-200">Syarat & Ketentuan</span>
                      <div className="h-px bg-white/30 flex-1" />
                    </div>
                    <ul className="space-y-4">
                      {[
                        'Voucher berlaku hingga 31 Desember 2026.',
                        'Berlaku untuk Tiket Basic, Regular, dan Terusan.',
                        'Satu voucher untuk maksimal 10 tiket.',
                        'Gunakan di family.thelodgegroup.id/booking atau claim langsung di loket.',
                        'Wajib ditunjukkan saat pembelian tiket.',
                        'Tidak dapat digabungkan dengan promo lain.'
                      ].map((tc, idx) => (
                        <li key={idx} className="flex gap-3 text-xs leading-relaxed font-medium">
                          <CheckCircle2 className="text-yellow-400 shrink-0 mt-0.5" size={14} />
                          {tc}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-white/10">
                  <p className="text-[10px] text-brand-200 font-bold uppercase tracking-widest text-center">
                    The Lodge Maribaya Experience
                  </p>
                </div>
              </div>

              {/* Right Side: Form or Success */}
              <div className="w-full md:w-7/12 p-8 md:p-12 bg-white flex flex-col justify-center">
                {claimSuccess ? (
                  <div className="text-center animate-in fade-in zoom-in duration-500 py-12">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
                      <CheckCircle2 className="text-green-600" size={56} />
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tight mb-3">Berhasil!</h3>
                    <p className="text-gray-500 text-sm mb-10 leading-relaxed px-4">
                      E-Voucher Anda telah dikirimkan ke <span className="font-bold text-gray-900">Email</span> dan <span className="font-bold text-gray-900">WhatsApp</span> Anda. Silakan cek pesan masuk untuk melihat detail voucher.
                    </p>
                    
                    <div className="bg-gray-50 border-4 border-dashed border-gray-100 rounded-[32px] p-8 mb-4 relative overflow-hidden group">
                      <div className="absolute -top-4 -right-4 w-16 h-16 bg-brand/5 rounded-full" />
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3">Kode Voucher Anda:</p>
                      <p className="text-4xl font-black text-brand tracking-[0.2em]">{claimSuccess}</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleVoucherSubmit} className="space-y-6">
                    <div className="mb-8">
                      <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-2">Data Pengunjung</h3>
                      <p className="text-gray-500 text-xs font-medium">Lengkapi data Anda untuk mendapatkan kode voucher instan.</p>
                    </div>

                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                        <Input 
                          required
                          placeholder="Hendra Rusli"
                          value={voucherForm.fullName}
                          onChange={e => setVoucherForm({...voucherForm, fullName: e.target.value})}
                          className="rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-brand focus:border-brand transition-all h-14 text-sm font-bold px-6"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nomor WhatsApp</label>
                          <Input 
                            required
                            type="tel"
                            placeholder="081234567xxx"
                            value={voucherForm.phoneNumber}
                            onChange={e => setVoucherForm({...voucherForm, phoneNumber: e.target.value})}
                            className="rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-brand focus:border-brand transition-all h-14 text-sm font-bold px-6"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Aktif</label>
                          <Input 
                            required
                            type="email"
                            placeholder="tamu@email.com"
                            value={voucherForm.email}
                            onChange={e => setVoucherForm({...voucherForm, email: e.target.value})}
                            className="rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-brand focus:border-brand transition-all h-14 text-sm font-bold px-6"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kota Asal</label>
                          <Input 
                            required
                            placeholder="Bandung"
                            value={voucherForm.city}
                            onChange={e => setVoucherForm({...voucherForm, city: e.target.value})}
                            className="rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-brand focus:border-brand transition-all h-14 text-sm font-bold px-6"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tanggal Kunjungan</label>
                          <Input 
                            required
                            type="date"
                            value={voucherForm.visitDate}
                            onChange={e => setVoucherForm({...voucherForm, visitDate: e.target.value})}
                            className="rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-brand focus:border-brand transition-all h-14 text-sm font-bold px-6"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Jumlah Rombongan</label>
                        <select 
                          value={voucherForm.visitorCount}
                          onChange={e => setVoucherForm({...voucherForm, visitorCount: e.target.value})}
                          className="w-full h-14 rounded-2xl bg-gray-50 border-transparent px-6 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-brand outline-none transition-all appearance-none cursor-pointer"
                        >
                          <option value="1 org">1 Orang</option>
                          <option value="2 org">2 Orang</option>
                          <option value="3-5 org">3-5 Orang</option>
                          <option value=">5 org">Lebih dari 5 Orang</option>
                        </select>
                      </div>
                    </div>

                    <Button 
                      type="submit"
                      disabled={claimLoading}
                      className="w-full bg-brand hover:bg-brand/90 text-white rounded-2xl font-black uppercase tracking-widest h-14 mt-4 shadow-lg shadow-brand/10 transition-all hover:scale-[1.02] active:scale-95"
                    >
                      {claimLoading ? (
                        <><Loader2 className="mr-2 h-5 w-4 animate-spin" /> Memproses...</>
                      ) : (
                        'Klaim Voucher Sekarang'
                      )}
                    </Button>
                    
                    <p className="text-[9px] text-gray-400 text-center font-medium px-4">
                      Dengan mengeklik tombol di atas, Anda setuju untuk menerima notifikasi voucher melalui Email dan WhatsApp.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
