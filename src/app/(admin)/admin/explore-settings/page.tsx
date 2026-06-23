'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Save, CheckCircle2, XCircle, Loader2, Settings2, Map as MapIcon, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface ComparisonRow {
  name: string;
  bas: boolean;
  reg: boolean;
  ter: boolean;
}

interface ItineraryItem {
  startTime: string;
  endTime: string;
  route: string;
  note: string;
}

interface AmenityItem {
  id: string;
  name: string;
  location: string;
  icon: string;
}

interface CalculatorItem {
  name: string;
  price: number;
  category: string;
}

export default function AdminExploreSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [priceBasic, setPriceBasic] = useState('');
  const [priceReguler, setPriceReguler] = useState('');
  const [priceTerusan, setPriceTerusan] = useState('');
  const [originalPriceBasic, setOriginalPriceBasic] = useState('');
  const [originalPriceReguler, setOriginalPriceReguler] = useState('');
  const [originalPriceTerusan, setOriginalPriceTerusan] = useState('');
  const [operationalStatus, setOperationalStatus] = useState('NORMAL');
  const [weatherInfo, setWeatherInfo] = useState('Cerah');
  const [statusMessage, setStatusMessage] = useState('Seluruh Wahana Beroperasi Normal');
  const [mapImageUrl, setMapImageUrl] = useState('');
  const [rows, setRows] = useState<ComparisonRow[]>([]);
  const [itineraries, setItineraries] = useState<ItineraryItem[]>([]);
  const [amenities, setAmenities] = useState<AmenityItem[]>([]);
  const [calculatorItems, setCalculatorItems] = useState<CalculatorItem[]>([]);

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
      setOriginalPriceBasic(data.originalPriceBasic || '');
      setOriginalPriceReguler(data.originalPriceReguler || '');
      setOriginalPriceTerusan(data.originalPriceTerusan || '');
      setOperationalStatus(data.operationalStatus || 'NORMAL');
      setWeatherInfo(data.weatherInfo || 'Cerah');
      setStatusMessage(data.statusMessage || 'Seluruh Wahana Beroperasi Normal');
      setMapImageUrl(data.mapImageUrl || '');
      setRows(JSON.parse(data.comparisonData || '[]'));
      setItineraries(JSON.parse(data.itineraryData || '[]'));
      setAmenities(JSON.parse(data.amenitiesData || '[]'));
      setCalculatorItems(JSON.parse(data.calculatorData || '[]'));
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
          originalPriceBasic,
          originalPriceReguler,
          originalPriceTerusan,
          operationalStatus,
          weatherInfo,
          statusMessage,
          mapImageUrl,
          comparisonData: rows,
          itineraryData: itineraries,
          amenitiesData: amenities,
          calculatorData: calculatorItems
        }),
      });

      if (res.ok) {
        toast({
          title: "Berhasil",
          description: "Pengaturan Explore berhasil disimpan",
        });
      } else {
        throw new Error('Gagal menyimpan');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menyimpan pengaturan",
        variant: "destructive"
      });
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

  const addItinerary = () => {
    setItineraries([...itineraries, { startTime: '08:00', endTime: '10:00', route: 'Rute Baru', note: 'Catatan' }]);
  };

  const removeItinerary = (index: number) => {
    setItineraries(itineraries.filter((_, i) => i !== index));
  };

  const updateItinerary = (index: number, field: keyof ItineraryItem, value: string) => {
    const newItin = [...itineraries];
    newItin[index] = { ...newItin[index], [field]: value };
    setItineraries(newItin);
  };

  const addAmenity = () => {
    setAmenities([...amenities, { id: Date.now().toString(), name: 'Fasilitas Baru', location: 'Lokasi', icon: 'MapPin' }]);
  };

  const removeAmenity = (index: number) => {
    setAmenities(amenities.filter((_, i) => i !== index));
  };

  const updateAmenity = (index: number, field: keyof AmenityItem, value: string) => {
    const newAmen = [...amenities];
    newAmen[index] = { ...newAmen[index], [field]: value };
    setAmenities(newAmen);
  };

  const addCalculatorItem = () => {
    setCalculatorItems([...calculatorItems, { name: 'Item Baru', price: 0, category: 'TIKET' }]);
  };

  const removeCalculatorItem = (index: number) => {
    setCalculatorItems(calculatorItems.filter((_, i) => i !== index));
  };

  const updateCalculatorItem = (index: number, field: keyof CalculatorItem, value: any) => {
    const newItems = [...calculatorItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setCalculatorItems(newItems);
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
            <CardTitle className="text-sm font-black text-gray-400 uppercase">Resort Digital Map</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-gray-400">Map Image URL</label>
              <div className="flex gap-2">
                <Input value={mapImageUrl} onChange={(e) => setMapImageUrl(e.target.value)} placeholder="/peta-resort.jpg" className="rounded-xl font-bold" />
              </div>
              <p className="text-[10px] text-gray-400">Upload peta ke menu 'Explore Products' dulu jika belum punya URL.</p>
            </div>
            {mapImageUrl && (
              <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-100 shadow-inner">
                <img src={mapImageUrl} alt="Map Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-lg">
          <CardHeader className="bg-gray-50/50 border-b">
            <CardTitle className="text-sm font-black text-gray-400 uppercase">Live Operational Status</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-gray-400">Status Wahana</label>
              <select 
                value={operationalStatus} 
                onChange={(e) => setOperationalStatus(e.target.value)}
                className="w-full h-10 rounded-xl border-gray-200 text-sm font-bold focus:ring-brand focus:border-brand"
              >
                <option value="NORMAL">Normal (Semua Buka)</option>
                <option value="WEATHER_DELAY">Weather Delay (Hujan/Angin)</option>
                <option value="MAINTENANCE">Maintenance (Pemeliharaan)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-gray-400">Info Cuaca</label>
              <Input value={weatherInfo} onChange={(e) => setWeatherInfo(e.target.value)} placeholder="Cerah / Mendung" className="rounded-xl font-bold" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-gray-400">Pesan Status</label>
              <Input value={statusMessage} onChange={(e) => setStatusMessage(e.target.value)} placeholder="Seluruh Wahana Beroperasi" className="rounded-xl font-bold" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-lg md:col-span-1">
          <CardHeader className="bg-gray-50/50 border-b">
            <CardTitle className="text-sm font-black text-gray-400 uppercase">Harga Paket (Total Value)</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-gray-400">Basic</label>
                <Input value={priceBasic} onChange={(e) => setPriceBasic(e.target.value)} placeholder="Rp 50.000" className="font-bold rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-gray-400">Harga Coret</label>
                <Input value={originalPriceBasic} onChange={(e) => setOriginalPriceBasic(e.target.value)} placeholder="Rp 75.000" className="text-xs text-gray-400 rounded-xl" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-gray-400">Reguler</label>
                <Input value={priceReguler} onChange={(e) => setPriceReguler(e.target.value)} placeholder="Rp 125.000" className="font-bold rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-gray-400">Harga Coret</label>
                <Input value={originalPriceReguler} onChange={(e) => setOriginalPriceReguler(e.target.value)} placeholder="Rp 150.000" className="text-xs text-gray-400 rounded-xl" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-gray-400">Terusan</label>
                <Input value={priceTerusan} onChange={(e) => setPriceTerusan(e.target.value)} placeholder="Rp 165.000" className="font-bold rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-gray-400">Harga Coret</label>
                <Input value={originalPriceTerusan} onChange={(e) => setOriginalPriceTerusan(e.target.value)} placeholder="Rp 285.000" className="text-xs text-gray-400 rounded-xl" />
              </div>
            </div>
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

      <Card className="rounded-3xl border-none shadow-xl overflow-hidden">
        <CardHeader className="bg-brand text-white p-6 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-black italic uppercase">Best Route Suggestions (Itinerary)</CardTitle>
            <p className="text-xs text-brand-foreground/80 font-medium">Atur rekomendasi rute berdasarkan jam kedatangan tamu.</p>
          </div>
          <Button onClick={addItinerary} variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20 text-white rounded-xl">
            <Plus size={18} className="mr-2" /> Tambah Waktu
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-4 px-6 text-xs font-black text-gray-400 uppercase w-32">Mulai</th>
                  <th className="py-4 px-6 text-xs font-black text-gray-400 uppercase w-32">Selesai</th>
                  <th className="py-4 px-6 text-xs font-black text-gray-400 uppercase">Rekomendasi Rute</th>
                  <th className="py-4 px-6 text-xs font-black text-gray-400 uppercase">Catatan Greeter</th>
                  <th className="py-4 px-6 text-right text-xs font-black text-gray-400 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {itineraries.map((itin, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <Input type="time" value={itin.startTime} onChange={(e) => updateItinerary(idx, 'startTime', e.target.value)} className="font-bold rounded-lg" />
                    </td>
                    <td className="py-4 px-6">
                      <Input type="time" value={itin.endTime} onChange={(e) => updateItinerary(idx, 'endTime', e.target.value)} className="font-bold rounded-lg" />
                    </td>
                    <td className="py-4 px-6">
                      <Input value={itin.route} onChange={(e) => updateItinerary(idx, 'route', e.target.value)} placeholder="Contoh: Funicular -> Sky Hammock" className="font-bold rounded-lg" />
                    </td>
                    <td className="py-4 px-6">
                      <Input value={itin.note} onChange={(e) => updateItinerary(idx, 'note', e.target.value)} placeholder="Contoh: Mumpung belum antre" className="text-sm rounded-lg" />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Button variant="ghost" size="icon" onClick={() => removeItinerary(idx)} className="text-gray-300 hover:text-red-500 hover:bg-red-50">
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

      <Card className="rounded-3xl border-none shadow-xl overflow-hidden">
        <CardHeader className="bg-gray-800 text-white p-6 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-black italic uppercase">Nearby Amenities (Fasilitas Umum)</CardTitle>
            <p className="text-xs text-gray-400 font-medium">Atur daftar fasilitas umum terdekat untuk panduan Greeter.</p>
          </div>
          <Button onClick={addAmenity} variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20 text-white rounded-xl">
            <Plus size={18} className="mr-2" /> Tambah Fasilitas
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-4 px-6 text-xs font-black text-gray-400 uppercase w-48">Nama Fasilitas</th>
                  <th className="py-4 px-6 text-xs font-black text-gray-400 uppercase">Lokasi / Arah</th>
                  <th className="py-4 px-6 text-xs font-black text-gray-400 uppercase w-32">Ikon</th>
                  <th className="py-4 px-6 text-right text-xs font-black text-gray-400 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {amenities.map((amenity, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <Input value={amenity.name} onChange={(e) => updateAmenity(idx, 'name', e.target.value)} placeholder="Contoh: Toilet" className="font-bold rounded-lg" />
                    </td>
                    <td className="py-4 px-6">
                      <Input value={amenity.location} onChange={(e) => updateAmenity(idx, 'location', e.target.value)} placeholder="Contoh: Dekat Area Resto" className="text-sm rounded-lg" />
                    </td>
                    <td className="py-4 px-6">
                      <select 
                        value={amenity.icon} 
                        onChange={(e) => updateAmenity(idx, 'icon', e.target.value)}
                        className="w-full h-10 rounded-lg border-gray-200 text-sm focus:ring-brand focus:border-brand"
                      >
                        <option value="Restroom">Toilet</option>
                        <option value="Mosque">Mushola</option>
                        <option value="FirstAid">P3K</option>
                        <option value="Baby">Ruang Bayi</option>
                        <option value="MapPin">Umum</option>
                      </select>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Button variant="ghost" size="icon" onClick={() => removeAmenity(idx)} className="text-gray-300 hover:text-red-500 hover:bg-red-50">
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

      <Card className="rounded-3xl border-none shadow-xl overflow-hidden">
        <CardHeader className="bg-orange-600 text-white p-6 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-black italic uppercase">Group Calculator Items</CardTitle>
            <p className="text-xs text-orange-100 font-medium">Daftar item dan harga untuk kalkulator simulasi group.</p>
          </div>
          <Button onClick={addCalculatorItem} variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20 text-white rounded-xl">
            <Plus size={18} className="mr-2" /> Tambah Item
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-4 px-6 text-xs font-black text-gray-400 uppercase w-48">Kategori</th>
                  <th className="py-4 px-6 text-xs font-black text-gray-400 uppercase">Nama Item / Paket</th>
                  <th className="py-4 px-6 text-xs font-black text-gray-400 uppercase w-48">Harga Satuan (Rp)</th>
                  <th className="py-4 px-6 text-right text-xs font-black text-gray-400 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {calculatorItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <Input 
                        value={item.category} 
                        onChange={(e) => updateCalculatorItem(idx, 'category', e.target.value.toUpperCase())}
                        placeholder="Contoh: TIKET"
                        className="font-black border-none bg-transparent focus:bg-white focus:ring-1 focus:ring-brand rounded-lg px-2 h-10 text-xs tracking-widest"
                      />
                    </td>
                    <td className="py-4 px-6">
                      <Input value={item.name} onChange={(e) => updateCalculatorItem(idx, 'name', e.target.value)} placeholder="Contoh: Paket Buffet" className="font-bold rounded-lg" />
                    </td>
                    <td className="py-4 px-6">
                      <Input 
                        type="number" 
                        value={item.price} 
                        onChange={(e) => updateCalculatorItem(idx, 'price', parseInt(e.target.value) || 0)} 
                        className="font-bold rounded-lg" 
                      />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Button variant="ghost" size="icon" onClick={() => removeCalculatorItem(idx)} className="text-gray-300 hover:text-red-500 hover:bg-red-50">
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
