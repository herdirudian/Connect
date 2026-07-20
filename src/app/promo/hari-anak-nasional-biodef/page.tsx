'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CalendarHeart, Users, MapPin, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function HariAnakNasionalBiodefPromoPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    parentName: '',
    parentEmail: '',
    parentCity: '',
    childName: '',
    childAge: '',
    visitDate: '',
    agreedToPrivacy: false,
    sponsor: 'BIODEF'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (value: string) => {
    setFormData(prev => ({ ...prev, visitDate: value }));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, agreedToPrivacy: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.agreedToPrivacy) {
      toast({
        title: "Perhatian",
        description: "Anda harus menyetujui Kebijakan Privasi Data untuk melanjutkan.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/promos/childrens-day/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Terjadi kesalahan');
      }

      setSuccess(true);
      toast({
        title: "Registrasi Berhasil!",
        description: "Data Anda telah tersimpan untuk Promo Hari Anak Nasional.",
      });

    } catch (error: any) {
      toast({
        title: "Gagal Registrasi",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-brand-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="text-2xl font-black text-brand-dark">Pendaftaran Berhasil!</h1>
          <p className="text-gray-600 text-sm">
            Terima kasih telah mendaftar Promo Hari Anak Nasional The Lodge Maribaya x Biodef. 
            Silakan simpan informasi ini atau tangkapan layar (screenshot) halaman ini sebagai bukti.
          </p>
          <div className="bg-brand-50 p-4 rounded-xl text-left space-y-2 text-sm border border-brand-100">
            <p><span className="font-semibold text-gray-500">Nama Orang Tua:</span> {formData.parentName}</p>
            <p><span className="font-semibold text-gray-500">Nama Anak:</span> {formData.childName}</p>
            <p><span className="font-semibold text-gray-500">Tanggal Kunjungan:</span> {
              formData.visitDate === '2026-07-23' ? 'Kamis, 23 Juli 2026' :
              formData.visitDate === '2026-07-24' ? 'Jumat, 24 Juli 2026' :
              formData.visitDate === '2026-07-25' ? 'Sabtu, 25 Juli 2026' :
              'Minggu, 26 Juli 2026'
            }</p>
          </div>
          <Button 
            onClick={() => {
              setSuccess(false);
              setFormData({
                parentName: '',
                parentPhone: '',
                parentEmail: '',
                parentCity: '',
                childName: '',
                childAge: '',
                visitDate: '',
                agreedToPrivacy: false
              });
            }}
            className="w-full bg-brand hover:bg-brand-dark text-white rounded-xl h-12"
          >
            Kembali ke Form Pendaftaran
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-brand text-white p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('/pattern.png')]"></div>
          <div className="relative z-10">
            <h1 className="text-3xl md:text-4xl font-black mb-3 drop-shadow-md">
              100 Tiket Wisata Gratis untuk Anak!
            </h1>
            <p className="text-brand-50 text-sm md:text-base font-medium">
              Rayakan Hari Anak Nasional bersama The Lodge Maribaya x Biodef
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* Bagian 1: Data Orang Tua */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <Users className="text-brand w-5 h-5" />
              <h2 className="text-lg font-bold text-gray-800">Data Orang Tua / Pendamping</h2>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="parentName">Nama Lengkap Orang Tua/Pendamping <span className="text-red-500">*</span></Label>
              <Input id="parentName" name="parentName" required value={formData.parentName} onChange={handleChange} placeholder="Sesuai KTP" className="h-12 rounded-xl" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentEmail">Email Aktif <span className="text-red-500">*</span></Label>
              <Input id="parentEmail" name="parentEmail" type="email" required value={formData.parentEmail} onChange={handleChange} placeholder="email@anda.com" className="h-12 rounded-xl" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentCity">Kota Asal (Domisili) <span className="text-red-500">*</span></Label>
              <Input id="parentCity" name="parentCity" required value={formData.parentCity} onChange={handleChange} placeholder="Contoh: Bandung" className="h-12 rounded-xl" />
            </div>
          </div>

          {/* Bagian 2: Data Anak */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 border-b pb-2">
              <Users className="text-orange-500 w-5 h-5" />
              <h2 className="text-lg font-bold text-gray-800">Data Anak</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="childName">Nama Lengkap Anak <span className="text-red-500">*</span></Label>
                <Input id="childName" name="childName" required value={formData.childName} onChange={handleChange} placeholder="Nama anak" className="h-12 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="childAge">Usia Anak <span className="text-red-500">*</span></Label>
                <Input id="childAge" name="childAge" type="number" min="0" max="18" required value={formData.childAge} onChange={handleChange} placeholder="Tahun" className="h-12 rounded-xl" />
              </div>
            </div>
          </div>

          {/* Bagian 3: Data Kunjungan */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 border-b pb-2">
              <CalendarHeart className="text-rose-500 w-5 h-5" />
              <h2 className="text-lg font-bold text-gray-800">Rencana Kunjungan</h2>
            </div>
            
            <div className="space-y-2">
              <Label>Pilih Tanggal Kunjungan <span className="text-red-500">*</span></Label>
              <select 
                required 
                value={formData.visitDate} 
                onChange={(e) => handleDateChange(e.target.value)}
                className="flex h-12 w-full items-center justify-between rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>-- Pilih Tanggal --</option>
                <option value="2026-07-23">Kamis, 23 Juli 2026</option>
                <option value="2026-07-24">Jum'at, 24 Juli 2026</option>
                <option value="2026-07-25">Sabtu, 25 Juli 2026</option>
                <option value="2026-07-26">Minggu, 26 Juli 2026</option>
              </select>
            </div>
          </div>

          {/* Syarat dan Ketentuan */}
          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-sm text-gray-700 space-y-3">
            <p className="font-bold text-orange-800">Syarat & Ketentuan Promo:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Berlaku untuk anak usia 5-17 tahun</li>
              <li>Registrasi dilakukan secara online</li>
              <li>1 Registrasi berlaku untuk 1 Anak + 1 Orang Tua/Pendamping</li>
              <li>Pilih tanggal kunjungan</li>
              <li>Kuota terbatas hanya 100 registrasi</li>
              <li>Berlaku selama periode promo</li>
              <li>Tidak dapat digabung dengan promo lain</li>
            </ul>
          </div>

          {/* Kebijakan Privasi (UU PDP) */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs text-gray-600 space-y-3">
            <p className="font-semibold text-gray-800">Kebijakan Privasi & Persetujuan Penggunaan Data</p>
            <p>
              Sesuai dengan Undang-Undang Pelindungan Data Pribadi (UU PDP) Republik Indonesia, dengan mengisi dan mengirimkan formulir ini, Anda memberikan persetujuan eksplisit kepada The Lodge Maribaya untuk:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Mengumpulkan, menyimpan, dan memproses data pribadi Anda (Nama, No. WhatsApp, Email, Kota) serta data anak Anda (Nama, Usia).</li>
              <li>Menggunakan data tersebut secara eksklusif untuk keperluan administrasi, verifikasi kedatangan, dan komunikasi terkait Promo Hari Anak Nasional.</li>
              <li>Data Anda akan dijaga kerahasiaannya, tidak akan diperjualbelikan kepada pihak ketiga, dan akan dikelola sesuai standar keamanan informasi yang berlaku.</li>
            </ul>
            
            <div className="flex items-start space-x-3 pt-3 border-t border-gray-200 mt-3">
              <input 
                type="checkbox"
                id="privacy" 
                checked={formData.agreedToPrivacy} 
                onChange={(e) => handleCheckboxChange(e.target.checked)} 
                className="mt-1 h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="privacy"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-brand-dark"
                >
                  Saya telah membaca, memahami, dan menyetujui Kebijakan Privasi di atas. <span className="text-red-500">*</span>
                </label>
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={loading || !formData.agreedToPrivacy} 
            className="w-full h-14 text-lg font-bold bg-brand hover:bg-brand-dark text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Memproses Pendaftaran...
              </>
            ) : (
              'Daftar Sekarang'
            )}
          </Button>

        </form>
      </div>
    </div>
  );
}
