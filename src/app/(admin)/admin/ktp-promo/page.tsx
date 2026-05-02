'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PAYMENT_METHODS } from '@/lib/fees';
import { Loader2, TrendingUp, Users, MapPin, Calendar } from 'lucide-react';

function listToLines(list: string[]) {
  return (list || []).join('\n');
}

function linesToList(s: string) {
  return String(s || '')
    .split(/[\r\n,]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function listToComma(list: string[]) {
  return (list || []).join(', ');
}

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
  paymentMethods: string[];
};

type AnalyticsData = {
  total: number;
  totalRevenue: number;
  provinces: Array<{ name: string; count: number; revenue: number }>;
  regencies: Array<{ name: string; count: number; revenue: number }>;
  daily: Array<{ date: string; count: number; revenue: number }>;
};

export default function AdminKtpPromoPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    active: false,
    title: 'Promo KTP',
    price: 0,
    terms: '',
    imageUrl: '',
    startDate: '',
    endDate: '',
    regions: [],
    paymentMethods: [],
  });
  const [districtTextMap, setDistrictTextMap] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  const paymentGroups = useMemo(() => {
    const groups = new Map<string, typeof PAYMENT_METHODS>();
    for (const m of PAYMENT_METHODS) {
      const list = groups.get(m.group) || [];
      list.push(m);
      groups.set(m.group, list);
    }
    return Array.from(groups.entries());
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/ktp-promo/settings');
        const data = await res.json();
        const regions = Array.isArray(data.regions) ? data.regions : [];
        const nextDistrictMap: Record<string, string> = {};
        for (let i = 0; i < regions.length; i++) {
          const regencies = Array.isArray(regions[i]?.regencies) ? regions[i].regencies : [];
          for (let j = 0; j < regencies.length; j++) {
            const districts = Array.isArray(regencies[j]?.districts) ? regencies[j].districts : [];
            nextDistrictMap[`${i}-${j}`] = listToComma(districts);
          }
        }
        setSettings({
          active: !!data.active,
          title: String(data.title || 'Promo KTP'),
          price: Number(data.price || 0) || 0,
          terms: String(data.terms || ''),
          imageUrl: String(data.imageUrl || ''),
          startDate: String(data.startDate || ''),
          endDate: String(data.endDate || ''),
          regions,
          paymentMethods: Array.isArray(data.paymentMethods) ? data.paymentMethods : [],
        });
        setDistrictTextMap(nextDistrictMap);
      } finally {
        setLoading(false);
      }
    }

    async function loadAnalytics() {
      setLoadingAnalytics(true);
      try {
        const res = await fetch('/api/admin/ktp-promo/analytics');
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        }
      } catch (e) {
        console.error('Failed to load analytics', e);
      } finally {
        setLoadingAnalytics(false);
      }
    }

    load();
    loadAnalytics();
  }, []);

  async function save() {
    setSaving(true);
    try {
      const regions = settings.regions.map((r, i) => ({
        province: r.province,
        regencies: r.regencies.map((g, j) => ({
          name: g.name,
          districts: linesToList(districtTextMap[`${i}-${j}`] ?? listToComma(g.districts)),
        })),
      }));
      const res = await fetch('/api/admin/ktp-promo/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, regions }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal menyimpan setting');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const uploadData = new FormData();
    uploadData.append('file', file);

    setUploading(true);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: uploadData });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Upload failed');
      }
      const data = await res.json();
      setSettings((p) => ({ ...p, imageUrl: String(data.url || '') }));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Promo KTP</h2>
          <p className="text-muted-foreground">Konfigurasi tiket masuk/wahana khusus Promo KTP.</p>
        </div>
        <Button onClick={save} disabled={saving || loading}>
          {saving ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </div>

      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-brand-50 border-brand-100">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 bg-brand-100 rounded-lg text-brand-dark">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-brand-dark uppercase tracking-wider">Total Pembeli</div>
                <div className="text-2xl font-black text-brand-dark">{analytics.total}</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">Total Pendapatan</div>
                <div className="text-xl font-black text-blue-700">Rp {analytics.totalRevenue.toLocaleString('id-ID')}</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-100">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 bg-orange-100 rounded-lg text-orange-700">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-orange-700 uppercase tracking-wider">Provinsi Terbanyak</div>
                <div className="text-lg font-black text-orange-700 truncate">{analytics.provinces[0]?.name || '-'}</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-100">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 bg-purple-100 rounded-lg text-purple-700">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-purple-700 uppercase tracking-wider">Tren Hari Ini</div>
                <div className="text-lg font-black text-purple-700">{analytics.daily[analytics.daily.length - 1]?.count || 0} Tiket</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Sebaran Provinsi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.provinces.slice(0, 5).map((p, i) => (
                  <div key={p.name} className="space-y-1">
                    <div className="flex justify-between text-sm font-bold">
                      <span>{p.name}</span>
                      <span>{p.count} Tiket</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand rounded-full" 
                        style={{ width: `${(p.count / analytics.total) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Sebaran Kota/Kabupaten
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.regencies.slice(0, 5).map((p, i) => (
                  <div key={p.name} className="space-y-1">
                    <div className="flex justify-between text-sm font-bold">
                      <span>{p.name}</span>
                      <span>{p.count} Tiket</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full" 
                        style={{ width: `${(p.count / analytics.total) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pengaturan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.active}
              onChange={(e) => setSettings((p) => ({ ...p, active: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
              id="active"
            />
            <label htmlFor="active" className="text-sm font-medium text-gray-700">
              Aktifkan Promo KTP
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Nama Promo</label>
              <Input value={settings.title} onChange={(e) => setSettings((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Harga (IDR)</label>
              <Input
                type="number"
                min={0}
                value={String(settings.price)}
                onChange={(e) => setSettings((p) => ({ ...p, price: Number(e.target.value || 0) || 0 }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Periode Promo Mulai</label>
              <Input
                type="date"
                value={String(settings.startDate || '')}
                onChange={(e) => setSettings((p) => ({ ...p, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Periode Promo Sampai</label>
              <Input
                type="date"
                value={String(settings.endDate || '')}
                onChange={(e) => setSettings((p) => ({ ...p, endDate: e.target.value }))}
                min={String(settings.startDate || '') || undefined}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Terms & Conditions</label>
            <Textarea
              value={settings.terms}
              onChange={(e) => setSettings((p) => ({ ...p, terms: e.target.value }))}
              placeholder="Tulis T&C yang harus dicentang pembeli..."
              className="min-h-[140px]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Gambar Promo</label>
            <div className="flex gap-2 items-center">
              <Input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading || loading || saving} />
              {uploading && <Loader2 className="animate-spin h-5 w-5 text-brand" />}
              {settings.imageUrl && (
                <Button variant="outline" size="sm" onClick={() => setSettings((p) => ({ ...p, imageUrl: '' }))} disabled={uploading || loading || saving}>
                  Hapus
                </Button>
              )}
            </div>
            {settings.imageUrl && (
              <div className="mt-2 relative h-40 w-full rounded-md overflow-hidden border border-gray-200">
                <img src={settings.imageUrl} alt="Promo" className="h-full w-full object-cover" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wilayah (Pilihan)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              Tambahkan provinsi, lalu kabupaten/kota di dalamnya, lalu kecamatan per kabupaten/kota.
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setSettings((p) => ({
                  ...p,
                  regions: [...p.regions, { province: '', regencies: [] }],
                }))
              }
              disabled={loading || saving}
            >
              + Provinsi
            </Button>
          </div>

          {settings.regions.length === 0 ? (
            <div className="text-sm text-gray-500">Belum ada wilayah yang diatur.</div>
          ) : (
            <div className="space-y-4">
              {settings.regions.map((r, provinceIdx) => (
                <div key={provinceIdx} className="border rounded-lg p-4 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-end gap-3">
                    <div className="flex-1 space-y-2">
                      <label className="text-sm font-medium text-gray-700">Provinsi</label>
                      <Input
                        value={r.province}
                        onChange={(e) =>
                          setSettings((p) => {
                            const next = [...p.regions];
                            next[provinceIdx] = { ...next[provinceIdx], province: e.target.value };
                            return { ...p, regions: next };
                          })
                        }
                        placeholder="Contoh: Jawa Barat"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSettings((p) => {
                            const next = [...p.regions];
                            const target = next[provinceIdx];
                            next[provinceIdx] = { ...target, regencies: [...target.regencies, { name: '', districts: [] }] };
                            return { ...p, regions: next };
                          })
                        }
                        disabled={loading || saving}
                      >
                        + Kabupaten/Kota
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          setSettings((p) => ({
                            ...p,
                            regions: p.regions.filter((_, i) => i !== provinceIdx),
                          }))
                        }
                        disabled={loading || saving}
                      >
                        Hapus Provinsi
                      </Button>
                    </div>
                  </div>

                  {r.regencies.length === 0 ? (
                    <div className="text-sm text-gray-500">Belum ada kabupaten/kota.</div>
                  ) : (
                    <div className="space-y-3">
                      {r.regencies.map((g, regencyIdx) => (
                        <div key={regencyIdx} className="border rounded-md p-3 space-y-3 bg-white">
                          <div className="flex flex-col md:flex-row md:items-end gap-3">
                            <div className="flex-1 space-y-2">
                              <label className="text-sm font-medium text-gray-700">Kabupaten/Kota</label>
                              <Input
                                value={g.name}
                                onChange={(e) =>
                                  setSettings((p) => {
                                    const next = [...p.regions];
                                    const province = next[provinceIdx];
                                    const regencies = [...province.regencies];
                                    regencies[regencyIdx] = { ...regencies[regencyIdx], name: e.target.value };
                                    next[provinceIdx] = { ...province, regencies };
                                    return { ...p, regions: next };
                                  })
                                }
                                placeholder="Contoh: Kota Bandung"
                              />
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                setSettings((p) => {
                                  const next = [...p.regions];
                                  const province = next[provinceIdx];
                                  next[provinceIdx] = { ...province, regencies: province.regencies.filter((_, i) => i !== regencyIdx) };
                                  return { ...p, regions: next };
                                })
                              }
                              disabled={loading || saving}
                            >
                              Hapus
                            </Button>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Kecamatan</label>
                            <Input
                              value={districtTextMap[`${provinceIdx}-${regencyIdx}`] ?? listToComma(g.districts)}
                              onChange={(e) =>
                                setDistrictTextMap((p) => ({ ...p, [`${provinceIdx}-${regencyIdx}`]: e.target.value }))
                              }
                              onBlur={() =>
                                setSettings((p) => {
                                  const next = [...p.regions];
                                  const province = next[provinceIdx];
                                  const regencies = [...province.regencies];
                                  const text = districtTextMap[`${provinceIdx}-${regencyIdx}`] ?? listToComma(regencies[regencyIdx].districts);
                                  regencies[regencyIdx] = { ...regencies[regencyIdx], districts: linesToList(text) };
                                  next[provinceIdx] = { ...province, regencies };
                                  return { ...p, regions: next };
                                })
                              }
                              placeholder="Contoh: Cicendo, Sumur Bandung, Coblong"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metode Pembayaran</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            Pilih metode pembayaran yang tampil untuk pembeli Promo KTP.
          </div>
          <div className="space-y-4">
            {paymentGroups.map(([group, methods]) => (
              <div key={group} className="space-y-2">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">{group}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {methods.map((m) => {
                    const checked = settings.paymentMethods.includes(m.id);
                    return (
                      <label key={m.id} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setSettings((p) => {
                              const next = new Set(p.paymentMethods);
                              if (e.target.checked) next.add(m.id);
                              else next.delete(m.id);
                              return { ...p, paymentMethods: Array.from(next) };
                            });
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                        />
                        <span>{m.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
