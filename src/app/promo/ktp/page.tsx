'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PAYMENT_METHODS } from '@/lib/fees';
import Image from 'next/image';

type Settings = {
  active: boolean;
  title: string;
  price: number;
  terms: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  regions: Array<{
    province: string;
    regencies: Array<{
      name: string;
      districts: string[];
    }>;
  }>;
  provinces: string[];
  regencies: string[];
  districts: string[];
  paymentMethods: string[];
};

export default function KtpPromoPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('');
  const [regency, setRegency] = useState('');
  const [district, setDistrict] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [visitDate, setVisitDate] = useState('');
  const [formError, setFormError] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<
    'name' | 'email' | 'phone' | 'province' | 'regency' | 'district' | 'visitDate' | 'paymentMethod' | 'termsAccepted',
    string
  >>>({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/ktp-promo/settings');
        const data = await res.json();
        const next: Settings = {
          active: !!data.active,
          title: String(data.title || 'Promo KTP'),
          price: Number(data.price || 0) || 0,
          terms: String(data.terms || ''),
          imageUrl: String(data.imageUrl || ''),
          startDate: String(data.startDate || ''),
          endDate: String(data.endDate || ''),
          regions: Array.isArray(data.regions) ? data.regions : [],
          provinces: Array.isArray(data.provinces) ? data.provinces : [],
          regencies: Array.isArray(data.regencies) ? data.regencies : [],
          districts: Array.isArray(data.districts) ? data.districts : [],
          paymentMethods: Array.isArray(data.paymentMethods) ? data.paymentMethods : [],
        };
        setSettings(next);
        if (next.paymentMethods.length > 0) setPaymentMethod(next.paymentMethods[0]);
        if (next.startDate) setVisitDate(next.startDate);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const allowedPaymentMethods = useMemo(() => {
    if (!settings) return [];
    if (settings.paymentMethods.length === 0) return PAYMENT_METHODS;
    return PAYMENT_METHODS.filter((m) => settings.paymentMethods.includes(m.id));
  }, [settings]);

  const provinceOptions = useMemo(() => {
    if (!settings?.regions?.length) return [];
    return settings.regions.map((r) => r.province).filter(Boolean);
  }, [settings]);

  const regencyOptions = useMemo(() => {
    if (!settings?.regions?.length) return [];
    const prov = settings.regions.find((r) => r.province === province);
    return (prov?.regencies || []).map((g) => g.name).filter(Boolean);
  }, [settings, province]);

  const districtOptions = useMemo(() => {
    if (!settings?.regions?.length) return [];
    const prov = settings.regions.find((r) => r.province === province);
    const reg = (prov?.regencies || []).find((g) => g.name === regency);
    return (reg?.districts || []).filter(Boolean);
  }, [settings, province, regency]);

  useEffect(() => {
    if (settings?.regions?.length) {
      setRegency('');
      setDistrict('');
      clearFieldError('regency');
      clearFieldError('district');
    }
  }, [province, settings?.regions?.length]);

  useEffect(() => {
    if (settings?.regions?.length) {
      setDistrict('');
      clearFieldError('district');
    }
  }, [regency, settings?.regions?.length]);

  function formatIDR(n: number) {
    try {
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
    } catch {
      return `Rp ${n}`;
    }
  }

  const cardClass = "border-gray-100 shadow-md rounded-2xl";

  function clearFieldError(key: keyof typeof fieldErrors) {
    setFieldErrors((p) => {
      if (!p[key]) return p;
      const next = { ...p };
      delete next[key];
      return next;
    });
  }

  function validate() {
    const next: typeof fieldErrors = {};
    if (!name.trim()) next.name = 'Nama wajib diisi';
    if (!email.trim()) next.email = 'Email wajib diisi';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Email tidak valid';
    if (!phone.trim()) next.phone = 'No HP wajib diisi';
    else if (phone.replace(/\D/g, '').length < 6) next.phone = 'No HP minimal 6 digit';

    if (!province.trim()) next.province = 'Provinsi wajib dipilih';
    if (!regency.trim()) next.regency = 'Kabupaten/Kota wajib dipilih';
    if (!district.trim()) next.district = 'Kecamatan wajib dipilih';

    if (!visitDate) next.visitDate = 'Tanggal kunjungan wajib dipilih';
    else if (settings?.startDate && visitDate < settings.startDate) next.visitDate = 'Tanggal kunjungan di luar periode promo';
    else if (settings?.endDate && visitDate > settings.endDate) next.visitDate = 'Tanggal kunjungan di luar periode promo';

    if (!paymentMethod) next.paymentMethod = 'Metode pembayaran wajib dipilih';
    if (!termsAccepted) next.termsAccepted = 'Wajib menyetujui Terms & Conditions';

    return next;
  }

  async function submit() {
    setFormError('');
    if (!settings?.active) {
      setFormError('Promo tidak aktif');
      return;
    }
    const clientErrors = validate();
    setFieldErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) {
      setFormError('Lengkapi data yang wajib diisi');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/ktp-promo/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          province,
          regency,
          district,
          visitDate,
          paymentMethod,
          termsAccepted,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.fieldErrors && typeof data.fieldErrors === 'object') {
          setFieldErrors(data.fieldErrors);
        }
        throw new Error(data.error || 'Gagal membuat pembayaran');
      }
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    } catch (e: any) {
      setFormError(e.message || 'Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 rounded-full border border-brand-100">
          <span className="w-2 h-2 rounded-full bg-brand animate-pulse"></span>
          <span className="text-[11px] font-bold tracking-widest uppercase text-brand-dark">Promo KTP</span>
        </div>

        <div className="relative h-56 rounded-2xl overflow-hidden bg-gray-100 shadow-md border border-gray-100">
          {settings?.imageUrl ? (
            <Image src={settings.imageUrl} alt={settings.title || 'Promo KTP'} fill className="object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-brand-50 via-white to-brand-50" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent flex items-end p-6">
            <div className="text-white">
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-none">{settings?.title || 'Promo KTP'}</h1>
              <div className="mt-2 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold backdrop-blur">
                <span>Harga</span>
                <span className="text-white/70">•</span>
                <span className="font-black">{formatIDR(settings?.price || 0)}</span>
              </div>
              {!settings?.active && <div className="mt-2 text-sm font-bold text-red-200">Promo sedang tidak aktif.</div>}
            </div>
          </div>
        </div>
      </div>

      <Card className={cardClass}>
        <CardHeader>
          <CardTitle className="text-xl font-black text-brand-dark uppercase tracking-tight">Data Pembeli</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Nama <span className="text-red-600">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError('name');
              }}
              className={fieldErrors.name ? 'border-red-400 focus-visible:ring-red-500' : undefined}
            />
            {fieldErrors.name && <div className="text-xs font-semibold text-red-600">{fieldErrors.name}</div>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Email <span className="text-red-600">*</span>
              </label>
              <Input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError('email');
                }}
                className={fieldErrors.email ? 'border-red-400 focus-visible:ring-red-500' : undefined}
              />
              {fieldErrors.email && <div className="text-xs font-semibold text-red-600">{fieldErrors.email}</div>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                No HP <span className="text-red-600">*</span>
              </label>
              <Input
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  clearFieldError('phone');
                }}
                className={fieldErrors.phone ? 'border-red-400 focus-visible:ring-red-500' : undefined}
              />
              {fieldErrors.phone && <div className="text-xs font-semibold text-red-600">{fieldErrors.phone}</div>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader>
          <CardTitle className="text-xl font-black text-brand-dark uppercase tracking-tight">Domisili (Sesuai KTP)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Provinsi <span className="text-red-600">*</span>
              </label>
              {settings?.regions?.length ? (
                <select
                  className={`w-full border rounded px-3 py-2 text-sm ${fieldErrors.province ? 'border-red-400' : ''}`}
                  value={province}
                  onChange={(e) => {
                    setProvince(e.target.value);
                    clearFieldError('province');
                  }}
                >
                  <option value="">Pilih</option>
                  {provinceOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              ) : settings?.provinces?.length ? (
                <select
                  className={`w-full border rounded px-3 py-2 text-sm ${fieldErrors.province ? 'border-red-400' : ''}`}
                  value={province}
                  onChange={(e) => {
                    setProvince(e.target.value);
                    clearFieldError('province');
                  }}
                >
                  <option value="">Pilih</option>
                  {settings.provinces.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  value={province}
                  onChange={(e) => {
                    setProvince(e.target.value);
                    clearFieldError('province');
                  }}
                  className={fieldErrors.province ? 'border-red-400 focus-visible:ring-red-500' : undefined}
                />
              )}
              {fieldErrors.province && <div className="text-xs font-semibold text-red-600">{fieldErrors.province}</div>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Kabupaten/Kota <span className="text-red-600">*</span>
              </label>
              {settings?.regions?.length ? (
                <select
                  className={`w-full border rounded px-3 py-2 text-sm ${fieldErrors.regency ? 'border-red-400' : ''}`}
                  value={regency}
                  onChange={(e) => {
                    setRegency(e.target.value);
                    clearFieldError('regency');
                  }}
                  disabled={!province}
                >
                  <option value="">Pilih</option>
                  {regencyOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              ) : settings?.regencies?.length ? (
                <select
                  className={`w-full border rounded px-3 py-2 text-sm ${fieldErrors.regency ? 'border-red-400' : ''}`}
                  value={regency}
                  onChange={(e) => {
                    setRegency(e.target.value);
                    clearFieldError('regency');
                  }}
                >
                  <option value="">Pilih</option>
                  {settings.regencies.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  value={regency}
                  onChange={(e) => {
                    setRegency(e.target.value);
                    clearFieldError('regency');
                  }}
                  className={fieldErrors.regency ? 'border-red-400 focus-visible:ring-red-500' : undefined}
                />
              )}
              {fieldErrors.regency && <div className="text-xs font-semibold text-red-600">{fieldErrors.regency}</div>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Kecamatan <span className="text-red-600">*</span>
              </label>
              {settings?.regions?.length ? (
                <select
                  className={`w-full border rounded px-3 py-2 text-sm ${fieldErrors.district ? 'border-red-400' : ''}`}
                  value={district}
                  onChange={(e) => {
                    setDistrict(e.target.value);
                    clearFieldError('district');
                  }}
                  disabled={!province || !regency}
                >
                  <option value="">Pilih</option>
                  {districtOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              ) : settings?.districts?.length ? (
                <select
                  className={`w-full border rounded px-3 py-2 text-sm ${fieldErrors.district ? 'border-red-400' : ''}`}
                  value={district}
                  onChange={(e) => {
                    setDistrict(e.target.value);
                    clearFieldError('district');
                  }}
                >
                  <option value="">Pilih</option>
                  {settings.districts.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  value={district}
                  onChange={(e) => {
                    setDistrict(e.target.value);
                    clearFieldError('district');
                  }}
                  className={fieldErrors.district ? 'border-red-400 focus-visible:ring-red-500' : undefined}
                />
              )}
              {fieldErrors.district && <div className="text-xs font-semibold text-red-600">{fieldErrors.district}</div>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader>
          <CardTitle className="text-xl font-black text-brand-dark uppercase tracking-tight">Tanggal Kunjungan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Pilih Tanggal <span className="text-red-600">*</span>
            </label>
            <Input
              type="date"
              value={visitDate}
              onChange={(e) => {
                setVisitDate(e.target.value);
                clearFieldError('visitDate');
              }}
              min={String(settings?.startDate || '') || undefined}
              max={String(settings?.endDate || '') || undefined}
              className={fieldErrors.visitDate ? 'border-red-400 focus-visible:ring-red-500' : undefined}
            />
            {fieldErrors.visitDate && <div className="text-xs font-semibold text-red-600">{fieldErrors.visitDate}</div>}
            {(settings?.startDate || settings?.endDate) && (
              <div className="text-xs text-gray-500 font-medium">
                Periode promo: {settings?.startDate || '-'} s/d {settings?.endDate || '-'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader>
          <CardTitle className="text-xl font-black text-brand-dark uppercase tracking-tight">Detail Tiket</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nama Tiket</div>
              <div className="font-black text-brand-dark truncate">{settings?.title || 'Promo KTP'}</div>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Jumlah</div>
                <div className="font-black text-gray-900">1</div>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Harga</div>
                <div className="font-black text-gray-900">{formatIDR(settings?.price || 0)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader>
          <CardTitle className="text-xl font-black text-brand-dark uppercase tracking-tight">Metode Pembayaran</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {allowedPaymentMethods.length === 0 ? (
            <div className="text-sm text-gray-500">Metode pembayaran belum diset oleh admin.</div>
          ) : (
            <div className="space-y-2">
              {allowedPaymentMethods.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={m.id}
                    checked={paymentMethod === m.id}
                    onChange={() => {
                      setPaymentMethod(m.id);
                      clearFieldError('paymentMethod');
                    }}
                  />
                  <span>{m.label}</span>
                </label>
              ))}
            </div>
          )}
          {fieldErrors.paymentMethod && <div className="text-xs font-semibold text-red-600">{fieldErrors.paymentMethod}</div>}
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader>
          <CardTitle className="text-xl font-black text-brand-dark uppercase tracking-tight">Terms & Conditions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-gray-700 whitespace-pre-wrap border rounded p-3 bg-gray-50">
            {settings?.terms || '-'}
          </div>
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => {
                setTermsAccepted(e.target.checked);
                clearFieldError('termsAccepted');
              }}
              className="mt-1"
            />
            <span>
              Saya setuju dengan Terms & Conditions di atas <span className="text-red-600">*</span>
            </span>
          </label>
          {fieldErrors.termsAccepted && <div className="text-xs font-semibold text-red-600">{fieldErrors.termsAccepted}</div>}
        </CardContent>
      </Card>

      {formError && <div className="text-sm text-red-600 font-semibold">{formError}</div>}

      <Button onClick={submit} disabled={submitting || loading || !settings?.active} className="w-full bg-brand hover:bg-brand-dark text-white font-bold">
        {submitting ? 'Memproses...' : 'Bayar Sekarang'}
      </Button>
    </div>
  );
}
