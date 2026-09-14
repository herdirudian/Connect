'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, QrCode, Search, Utensils, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PAYMENT_METHODS, calculateFee } from '@/lib/fees';
import { PaymentMethodSelector } from '@/components/PaymentMethodSelector';
import QRCode from 'qrcode';

type Restaurant = {
  id: string;
  name: string;
  status: string;
  allowOrders?: boolean;
  allowRoomService?: boolean;
  allowDineIn?: boolean;
};

type MenuItem = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  category: string;
  imageUrl?: string;
  soldOut?: boolean;
  stock?: number | null;
  minOrderQty?: number;
  variants?: string | null;
};

function getVariantsList(variantsStr?: string | null): string[] {
  if (!variantsStr) return [];
  return variantsStr.split(',').map((s) => s.trim()).filter(Boolean);
}

function getCartKey(menuItemId: string, variant?: string | null): string {
  if (!variant) return menuItemId;
  return `${menuItemId}::${variant}`;
}

function parseCartKey(cartKey: string): { menuItemId: string; variant: string | null } {
  const parts = cartKey.split('::');
  return {
    menuItemId: parts[0],
    variant: parts[1] || null,
  };
}

function getItemTotalQtyInCart(menuItemId: string, qtyMap: Record<string, number>): number {
  let count = 0;
  for (const [key, qty] of Object.entries(qtyMap)) {
    if (key === menuItemId || key.startsWith(`${menuItemId}::`)) {
      count += qty;
    }
  }
  return count;
}

export default function DineInPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hours, setHours] = useState<{ open: string; close: string } | null>(null);
  const [nowTick, setNowTick] = useState(0);

  const [tableNumber, setTableNumber] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [serviceType, setServiceType] = useState<'DINE_IN' | 'TAKE_AWAY'>('DINE_IN');

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [tableSlug, setTableSlug] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutQuantities, setCheckoutQuantities] = useState<Record<string, number>>({});
  const [selectedMethod, setSelectedMethod] = useState<string>('');

  const categories = useMemo(() => {
    const uniq = Array.from(
      new Set(
        menu.map(i => (typeof i.category === 'string' ? i.category.trim() : '')).filter(Boolean)
      )
    ).sort() as string[];
    return ['ALL', ...uniq];
  }, [menu]);

  const categoryStats = useMemo(() => {
    const stats: Record<string, { count: number; minPrice: number; image?: string }> = {};
    menu.forEach(item => {
      const cat = item.category || 'Other';
      if (!stats[cat]) {
        stats[cat] = { count: 0, minPrice: item.price, image: item.imageUrl };
      }
      stats[cat].count++;
      if (item.price < stats[cat].minPrice) stats[cat].minPrice = item.price;
      if (!stats[cat].image && item.imageUrl) stats[cat].image = item.imageUrl;
    });
    return stats;
  }, [menu]);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      const slug = params.get('table');
      if (slug) {
        setTableSlug(slug);
        fetchTable(slug);
      } else {
        // Clear state if no slug
        setTableSlug(null);
        setTableNumber('');
        // Do NOT auto-select restaurant if no table, let user pick
        setSelectedRestaurant(null);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNowTick((v) => v + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  async function fetchTable(slug: string) {
    try {
      const res = await fetch(`/api/dine-in/tables/${encodeURIComponent(slug)}`, {
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setTableNumber(data.number || '');
        if (data.restaurant) {
          setSelectedRestaurant(data.restaurant);
          if (data.restaurant.openingTime && data.restaurant.closingTime) {
            setHours({ open: data.restaurant.openingTime, close: data.restaurant.closingTime });
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    if (selectedRestaurant && !tableSlug) {
      fetchMenu(selectedRestaurant.id);
      fetchRestaurantHours(selectedRestaurant.id);
    } else if (selectedRestaurant && tableSlug) {
      fetchMenu(selectedRestaurant.id);
    }
  }, [selectedRestaurant, tableSlug]);

  async function fetchRestaurantHours(restaurantId: string) {
    try {
      const res = await fetch(`/api/admin/dine-in/hours?restaurantId=${restaurantId}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.open && data?.close) setHours({ open: data.open, close: data.close });
      }
    } catch {}
  }

  async function fetchRestaurants() {
    try {
      const res = await fetch('/api/restaurants', {
        cache: 'no-store'
      });
      const data = await res.json();
      const list: Restaurant[] = Array.isArray(data) ? data : [];
      const active = list.filter((r) => r.status === 'Open' && r.allowDineIn !== false);
      setRestaurants(active);
      // Removed auto-selection of the first restaurant
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMenu(id: string) {
    try {
      const res = await fetch(`/api/restaurants/${id}`, {
        cache: 'no-store'
      });
      const data = await res.json();
      const items: MenuItem[] = data?.menuItems || [];
      setMenu(items);
      setSelectedCategory('ALL');
      setQuantities({});
      setItemNotes({});
    } catch (e) {
      console.error(e);
    }
  }

  const total = useMemo(() => {
    return Object.entries(quantities).reduce((sum, [cartKey, qty]) => {
      if (qty <= 0) return sum;
      const { menuItemId } = parseCartKey(cartKey);
      const item = menu.find((m) => m.id === menuItemId);
      return sum + (item ? item.price * qty : 0);
    }, 0);
  }, [menu, quantities]);

  function validateMinOrderPerItem(src: Record<string, number>) {
    const aggregated: Record<string, number> = {};
    for (const [cartKey, qty] of Object.entries(src)) {
      if (!qty || qty <= 0) continue;
      const { menuItemId } = parseCartKey(cartKey);
      aggregated[menuItemId] = (aggregated[menuItemId] || 0) + qty;
    }

    for (const [menuItemId, totalQty] of Object.entries(aggregated)) {
      const meta = menu.find((m) => m.id === menuItemId);
      const minQty = Math.max(1, Number(meta?.minOrderQty) || 1);
      if (totalQty < minQty) {
        const name = meta?.name || 'Item';
        return `${name}: minimal order total ${minQty}`;
      }
    }
    return null;
  }

  function setQty(cartKey: string, qty: number) {
    const { menuItemId } = parseCartKey(cartKey);
    const item = menu.find((m) => m.id === menuItemId);
    const currentTotal = getItemTotalQtyInCart(menuItemId, quantities);
    const currentKeyQty = quantities[cartKey] || 0;
    const otherQty = currentTotal - currentKeyQty;
    const maxStock = typeof item?.stock === 'number' ? item.stock : 99;
    const maxAllowedForKey = Math.max(0, maxStock - otherQty);
    
    const finalKeyQty = Math.max(0, Math.min(maxAllowedForKey, qty));
    setQuantities(prev => ({ ...prev, [cartKey]: finalKeyQty }));
  }

  function setNote(cartKey: string, note: string) {
    setItemNotes(prev => ({ ...prev, [cartKey]: note.slice(0, 200) }));
  }

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredMenu = useMemo(() => {
    const base = selectedCategory === 'ALL' ? menu : menu.filter((item) => item.category === selectedCategory);
    if (!normalizedQuery) return base;
    return base.filter((item) => {
      const name = String(item.name || '').toLowerCase();
      const category = String(item.category || '').toLowerCase();
      return name.includes(normalizedQuery) || category.includes(normalizedQuery);
    });
  }, [menu, selectedCategory, normalizedQuery]);

  const isOpenNow = useMemo(() => {
    if (!hours) return true;
    const [oh, om] = hours.open.split(':').map(Number);
    const [ch, cm] = hours.close.split(':').map(Number);
    const nowJakarta = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const nowMinutes = nowJakarta.getHours() * 60 + nowJakarta.getMinutes();
    const openMinutes = oh * 60 + om;
    const closeMinutes = ch * 60 + cm;
    return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
  }, [hours, nowTick]);

  const recommendations = useMemo(() => {
    const available = menu.filter(m => 
      getItemTotalQtyInCart(m.id, checkoutQuantities) <= 0 && 
      !m.soldOut && 
      (typeof m.stock !== 'number' || m.stock > 0)
    );
    return available.sort(() => 0.5 - Math.random()).slice(0, 3);
  }, [menu, checkoutQuantities, checkoutOpen]);

  function openCheckout() {
    if (!selectedRestaurant) return;
    if (!guestName || !tableNumber || !guestPhone) {
      alert('Nama tamu, nomor meja, dan nomor HP wajib diisi');
      return;
    }
    const hasAny = Object.values(quantities).some(q => q > 0);
    if (!hasAny) {
      alert('Silakan pilih menu terlebih dahulu');
      return;
    }
    const minError = validateMinOrderPerItem(quantities);
    if (minError) {
      alert(`Minimal order item belum terpenuhi: ${minError}`);
      return;
    }
    setCheckoutQuantities(quantities);
    setCheckoutOpen(true);
  }

  async function submitOrder(methodOverride?: string) {
    if (!selectedRestaurant) return;
    if (!guestName || !tableNumber || !guestPhone) {
      alert('Nama tamu, nomor meja, dan nomor HP wajib diisi');
      return;
    }
    if (!(methodOverride || selectedMethod)) {
      alert('Pilih metode pembayaran terlebih dahulu');
      return;
    }
    const effectiveFood = checkoutOpen ? checkoutQuantities : quantities;
    const items = Object.entries(effectiveFood)
      .filter(([, qty]) => qty > 0)
      .map(([cartKey, quantity]) => {
        const { menuItemId, variant } = parseCartKey(cartKey);
        const rawNote = itemNotes[cartKey] || '';
        const fullNote = variant
          ? `[Varian: ${variant}]${rawNote ? ' ' + rawNote : ''}`
          : rawNote || undefined;

        return { menuItemId, quantity, requestNote: fullNote };
      });
    
    if (items.length === 0) {
      alert('Silakan pilih item terlebih dahulu');
      return;
    }
    const minError = validateMinOrderPerItem(effectiveFood);
    if (minError) {
      alert(`Minimal order item belum terpenuhi: ${minError}`);
      return;
    }
    setSubmitting(true);
    setPaymentUrl(null);
    try {
      const res = await fetch('/api/dine-in/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: selectedRestaurant.id,
          items,
          tableNumber,
          tableSlug: tableSlug || undefined,
          guestName,
          guestPhone,
          serviceType,
          paymentMethod: methodOverride || selectedMethod
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCheckoutOpen(false);
        if (data.paymentUrl) {
          window.location.href = data.paymentUrl;
        }
      } else {
        alert(data.error || 'Gagal membuat pesanan');
      }
    } catch (e) {
      console.error(e);
      alert('Terjadi kesalahan saat memproses pesanan');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 pb-24">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 rounded-full border border-brand-100">
          <span className="w-2 h-2 rounded-full bg-brand animate-pulse"></span>
          <span className="text-[11px] font-bold tracking-widest uppercase text-brand-dark">Dine In</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight leading-none text-brand-dark">
          Order to Your Table
        </h1>
        <p className="text-gray-500 max-w-xl text-sm font-medium">
          Pesan makanan dan minuman langsung dari meja Anda dengan mudah dan praktis.
        </p>
        {hours && (
          <div
            className={`inline-flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
              isOpenNow ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isOpenNow ? 'bg-green-600' : 'bg-red-600'}`} />
            <span>{isOpenNow ? 'Layanan Dine In Sedang Buka' : 'Layanan Dine In Sedang Tutup'}</span>
            <span className="text-gray-500">•</span>
            <span className={isOpenNow ? 'text-green-800' : 'text-red-800'}>Jam Operasional {hours.open}-{hours.close}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin h-8 w-8 text-brand" />
        </div>
      ) : (
        <>
          {!tableSlug && (
            <Card className="border border-gray-100 shadow-sm bg-white rounded-2xl">
              <CardHeader>
                <CardTitle className="text-xl font-black text-brand-dark uppercase tracking-tight">Pilih Restoran</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {!isOpenNow ? (
                    <div className="text-sm text-gray-600 sm:col-span-2">
                      Layanan Dine In sedang tutup. Pilihan restoran akan muncul otomatis saat jam operasional dimulai.
                    </div>
                  ) : (
                    <>
                      {restaurants.map((r) => (
                        <button
                          key={r.id}
                          className={`p-4 rounded-xl text-left transition border-2 ${
                            selectedRestaurant?.id === r.id ? 'border-brand bg-brand-50' : 'border-gray-200 hover:bg-gray-50'
                          }`}
                          onClick={() => setSelectedRestaurant(r)}
                          disabled={r.status !== 'Open' || r.allowOrders === false}
                        >
                          <div className="flex items-center gap-3">
                            <Utensils size={18} />
                            <div className="font-bold text-gray-900">{r.name}</div>
                          </div>
                          <div className="text-[11px] font-bold uppercase tracking-wider mt-2">
                            <span className={`${r.status === 'Open' ? 'text-green-600' : 'text-red-600'}`}>
                              {r.status === 'Open' ? 'Buka' : 'Tutup'}
                            </span>
                            <span className="text-gray-500 ml-1">• {r.allowOrders === false ? 'Pemesanan ditutup' : 'Pemesanan tersedia'}</span>
                          </div>
                        </button>
                      ))}
                      {restaurants.length === 0 && <div className="text-gray-500 sm:col-span-2">Tidak ada restoran yang buka</div>}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border border-gray-100 shadow-sm bg-white rounded-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-black text-brand-dark uppercase tracking-tight">Data Meja & Tamu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-sm font-bold text-gray-700">Opsi Penyajian / Layanan</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setServiceType('DINE_IN')}
                      className={`p-3 rounded-xl border-2 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
                        serviceType === 'DINE_IN'
                          ? 'border-brand bg-brand-50 text-brand-dark shadow-sm'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <Utensils className="w-4 h-4" />
                      Makan di Tempat (Dine In)
                    </button>
                    <button
                      type="button"
                      onClick={() => setServiceType('TAKE_AWAY')}
                      className={`p-3 rounded-xl border-2 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
                        serviceType === 'TAKE_AWAY'
                          ? 'border-orange-500 bg-orange-50 text-orange-800 shadow-sm'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      Bawa Pulang (Take Away)
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nomor Meja</Label>
                  <Input value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} placeholder="Misal: 1, 2, VIP1" disabled={!!tableSlug} />
                  {tableSlug && <div className="text-[11px] text-gray-500">Nomor meja otomatis dari QR, tidak dapat diubah.</div>}
                </div>
                <div className="space-y-2">
                  <Label>Nama Pemesan</Label>
                  <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Nama lengkap" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>No. Handphone</Label>
                  <Input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-100 shadow-sm bg-white rounded-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-black text-brand-dark uppercase tracking-tight">Cari Item</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari makanan/minuman..."
                />
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setSearchQuery('')}
                  disabled={!searchQuery.trim()}
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-100 shadow-sm bg-white rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-xl font-black text-brand-dark uppercase tracking-tight">
                {selectedCategory === 'ALL' && !searchQuery ? 'Menu Categories' : `Menu: ${selectedCategory}`}
              </CardTitle>
              {(selectedCategory !== 'ALL' || !!searchQuery) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setSelectedCategory('ALL'); setSearchQuery(''); }}
                  className="text-brand font-bold hover:text-brand-dark hover:bg-brand-50"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to Categories
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {menu.length === 0 ? (
                <div className="text-center py-20 text-gray-400 font-medium">Menu belum tersedia</div>
              ) : selectedCategory === 'ALL' && !searchQuery ? (
                /* Category Grid View */
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                  {categories.filter(c => c !== 'ALL').map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className="group relative flex flex-col bg-white border-2 border-gray-100 rounded-3xl overflow-hidden hover:border-brand transition-all hover:shadow-lg text-left"
                    >
                      <div className="aspect-[4/3] relative bg-gray-50 overflow-hidden">
                        {categoryStats[cat]?.image ? (
                          <Image src={categoryStats[cat].image!} alt={cat} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-200">
                            <Utensils size={40} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                        <div className="absolute bottom-3 left-3 right-3 text-white">
                          <div className="text-xs font-black uppercase tracking-tighter opacity-80">Category</div>
                          <div className="text-lg font-black uppercase leading-tight truncate">{cat}</div>
                        </div>
                      </div>
                      <div className="p-3 bg-white flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{categoryStats[cat]?.count || 0} Items</span>
                        <div className="bg-brand-50 text-brand-dark p-1.5 rounded-xl group-hover:bg-brand group-hover:text-white transition-colors">
                          <ArrowLeft className="h-3 w-3 rotate-180" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : filteredMenu.length === 0 ? (
                <div className="text-center py-20 text-gray-400 font-medium">Item menu tidak ditemukan.</div>
              ) : (
                /* Items View */
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredMenu.map((item) => {
                    const vList = getVariantsList(item.variants);
                    const activeVariant = vList.length > 0 ? (selectedVariants[item.id] || vList[0]) : null;
                    const activeCartKey = getCartKey(item.id, activeVariant);
                    const activeQty = quantities[activeCartKey] || 0;
                    const totalItemQtyInCart = getItemTotalQtyInCart(item.id, quantities);

                    return (
                      <Card key={item.id} className="flex flex-col hover:shadow-md transition-shadow border-2 rounded-2xl overflow-hidden">
                        <div className="relative h-36 bg-gray-50 overflow-hidden">
                          {item.imageUrl ? (
                            <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-300">
                              <Utensils size={28} />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-bold text-gray-900">{item.name}</div>
                              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">{item.category}</div>
                              {!!item.description && (
                                <div className="mt-1 text-xs text-gray-500 line-clamp-2">
                                  {item.description}
                                </div>
                              )}
                            </div>
                            <div className="font-bold">Rp {item.price.toLocaleString()}</div>
                          </div>
                          <div className="mt-2">
                            {(item.soldOut || (typeof item.stock === 'number' && item.stock <= 0)) ? (
                              <span className="text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-700">Sold Out</span>
                            ) : (
                              <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-700">Available</span>
                            )}
                          </div>
                          {vList.length > 0 && (
                            <div className="mt-3">
                              <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">Pilih Variasi</Label>
                              <div className="flex flex-wrap gap-1.5">
                                {vList.map((v) => {
                                  const isSelected = activeVariant === v;
                                  const vCartKey = getCartKey(item.id, v);
                                  const vQty = quantities[vCartKey] || 0;
                                  return (
                                    <button
                                      key={v}
                                      type="button"
                                      onClick={() => setSelectedVariants(prev => ({ ...prev, [item.id]: v }))}
                                      className={`px-2.5 py-1 text-xs rounded-lg font-bold transition border relative ${
                                        isSelected
                                          ? 'bg-brand text-white border-brand shadow-sm'
                                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                      }`}
                                    >
                                      {v}
                                      {vQty > 0 && (
                                        <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                                          isSelected ? 'bg-white text-brand-dark' : 'bg-brand text-white'
                                        }`}>
                                          {vQty}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          <div className="mt-3 flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setQty(activeCartKey, activeQty - 1)} disabled={item.soldOut || (typeof item.stock === 'number' && item.stock <= 0)}>-</Button>
                            <Input
                              className="w-16 text-center font-bold"
                              type="number"
                              min={0}
                              max={typeof item.stock === 'number' ? item.stock : 99}
                              value={activeQty}
                              onChange={(e) => setQty(activeCartKey, parseInt(e.target.value || '0', 10))}
                              disabled={item.soldOut || (typeof item.stock === 'number' && item.stock <= 0)}
                            />
                            <Button size="sm" onClick={() => setQty(activeCartKey, activeQty + 1)} disabled={(typeof item.stock === 'number' && totalItemQtyInCart >= item.stock) || item.soldOut || (typeof item.stock === 'number' && item.stock <= 0)}>+</Button>
                          </div>
                          {totalItemQtyInCart > 0 && vList.length > 0 && (
                            <div className="mt-2 text-xs font-semibold text-brand-dark bg-brand-50 p-2 rounded-lg border border-brand-100 flex flex-wrap gap-1.5 items-center">
                              <span className="font-bold text-[11px]">Di keranjang:</span>
                              {vList.map(v => {
                                const q = quantities[getCartKey(item.id, v)] || 0;
                                if (q <= 0) return null;
                                return (
                                  <span key={v} className="bg-white px-2 py-0.5 rounded border text-[11px] font-bold text-gray-800 shadow-xs">
                                    {q}x {v}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          <div className="mt-2 text-xs text-gray-500">
                            {item.soldOut ? 'Sold' : (typeof item.stock === 'number' ? `Stok: ${item.stock}` : 'Selalu ready')}
                          </div>
                          <div className="mt-3">
                            <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                              Catatan {activeVariant ? `(${activeVariant})` : ''} (opsional)
                            </Label>
                            <Input
                              value={itemNotes[activeCartKey] || ''}
                              onChange={(e) => setNote(activeCartKey, e.target.value)}
                              placeholder="Contoh: tidak pedas / kurang manis"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
              <div className="mt-6"></div>

              {!isOpenNow && hours && (
                <div className="mt-3 text-sm text-red-600">
                  Pemesanan Dine In hanya tersedia pukul {hours.open}-{hours.close}.
                </div>
              )}

              {paymentUrl && (
                <div className="mt-4 p-4 border-2 rounded-2xl bg-green-50 text-green-700">
                  Pembayaran dibuat. Silakan buka link berikut untuk menyelesaikan pembayaran:
                  <div className="mt-2">
                    <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                      Buka Link Pembayaran
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
      {/* Floating bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <div className="text-base md:text-lg font-black text-brand-dark uppercase tracking-tight">
              Total: Rp {total.toLocaleString()}
            </div>
          </div>
          <Button
            className="bg-brand text-white hover:bg-brand-dark"
            onClick={openCheckout}
            disabled={submitting || total <= 0 || !selectedRestaurant || !isOpenNow}
          >
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Membuat Pesanan...</> : 'Bayar & Buat Pesanan'}
          </Button>
        </div>
      </div>
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Konfirmasi Pesanan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-xl border flex items-center justify-between text-xs font-bold">
              <span className="text-gray-600">Opsi Layanan:</span>
              <span className={serviceType === 'TAKE_AWAY' ? 'text-orange-700 font-extrabold flex items-center gap-1' : 'text-brand-dark font-extrabold flex items-center gap-1'}>
                {serviceType === 'TAKE_AWAY' ? '🛍️ Bawa Pulang (Take Away)' : '🍽️ Makan di Tempat (Dine In)'}
              </span>
            </div>
            <div className="space-y-2">
              {Object.entries(checkoutQuantities)
                .filter(([, qty]) => qty > 0)
                .map(([cartKey, qty]) => {
                  const { menuItemId, variant } = parseCartKey(cartKey);
                  const m = menu.find((item) => item.id === menuItemId);
                  if (!m) return null;
                  return (
                    <div key={cartKey} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="min-w-0 w-full sm:flex-1 sm:mr-3">
                        <div className="font-bold flex items-center flex-wrap gap-2 text-gray-900">
                          <span>{m.name}</span>
                          {variant && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-brand-50 text-brand-dark border border-brand-100">
                              Varian: {variant}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 font-semibold mt-0.5">Rp {m.price.toLocaleString()}</div>
                        {!!m.description && (
                          <div className="mt-1 text-xs text-gray-500 line-clamp-2">
                            {m.description}
                          </div>
                        )}
                        <Input
                          className="mt-2 h-8 text-xs px-2.5 w-full bg-white"
                          placeholder={`Catatan ${variant ? `(${variant})` : ''}...`}
                          value={itemNotes[cartKey] || ''}
                          onChange={(e) => setNote(cartKey, e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-2 justify-end w-full sm:w-auto sm:flex-shrink-0">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setCheckoutQuantities(prev => ({ ...prev, [cartKey]: Math.max(0, (prev[cartKey] || 0) - 1) }))}
                        >
                          -
                        </Button>
                        <Input
                          className="w-14 h-8 text-center px-2 font-bold"
                          type="number"
                          min={0}
                          value={checkoutQuantities[cartKey] || 0}
                          onChange={(e) => setCheckoutQuantities(prev => ({ ...prev, [cartKey]: Math.max(0, parseInt(e.target.value || '0', 10)) }))}
                        />
                        <Button
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setCheckoutQuantities(prev => ({ ...prev, [cartKey]: (prev[cartKey] || 0) + 1 }))}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {recommendations.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-dashed border-gray-200">
                <div className="text-xs font-bold uppercase tracking-wider text-brand-dark">Rekomendasi Tambahan</div>
                <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-3 sm:overflow-x-auto sm:pb-2 scrollbar-hide">
                  {recommendations.map(item => {
                    const recCartKey = getCartKey(item.id, getVariantsList(item.variants)[0]);
                    return (
                      <div key={item.id} className="w-full sm:flex-shrink-0 sm:w-36 p-2 border rounded-lg bg-gray-50 flex flex-col justify-between">
                        <div>
                          <div className="font-bold text-sm truncate" title={item.name}>{item.name}</div>
                          <div className="text-xs text-gray-500">Rp {item.price.toLocaleString()}</div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="mt-2 w-full text-xs h-7 border-brand text-brand hover:bg-brand hover:text-white font-bold"
                          onClick={() => setCheckoutQuantities(prev => ({ ...prev, [recCartKey]: (prev[recCartKey] || 0) + 1 }))}
                        >
                          + Tambah
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(() => {
              const subtotal = Object.entries(checkoutQuantities).reduce((sum, [cartKey, qty]) => {
                if (qty <= 0) return sum;
                const { menuItemId } = parseCartKey(cartKey);
                const m = menu.find((item) => item.id === menuItemId);
                return sum + (m ? m.price * qty : 0);
              }, 0);

              return (
                <PaymentMethodSelector
                  selectedMethod={selectedMethod}
                  onSelectMethod={setSelectedMethod}
                  subtotal={subtotal}
                />
              );
            })()}
          </div>
          <DialogFooter className="pt-2">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold h-11 text-sm sm:text-base w-full sm:w-auto shadow-md shadow-emerald-600/20 rounded-xl"
              disabled={submitting || !selectedMethod}
              onClick={() => submitOrder()}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses Pesanan...
                </>
              ) : (
                'Lanjutkan ke Pembayaran'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}