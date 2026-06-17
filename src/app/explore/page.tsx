'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Map as MapIcon, 
  Play, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Search,
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Coffee,
  Camera,
  Utensils,
  Ticket,
  Bus,
  Zap,
  Heart,
  Star,
  QrCode,
  ArrowRightLeft,
  CloudSun,
  X,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import QRCode from 'qrcode';

interface Promotion {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  linkUrl: string | null;
}

interface Attraction {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  videoUrl?: string;
  status: 'OPEN' | 'MAINTENANCE' | 'CROWDED';
  waitTime?: string;
  tags?: string;
  benefits?: string;
}

export default function GreeterHubPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPromo, setCurrentPromo] = useState(0);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [zoom, setZoom] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showQR, setShowQR] = useState<{ url: string; name: string } | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [qrImageData, setQRImageData] = useState<string>('');

  const mapRef = useRef<HTMLDivElement>(null);

  const categories = [
    { id: 'ALL', label: 'Semua', icon: LayoutDashboard },
    { id: 'TICKET', label: 'Tiket Masuk', icon: Ticket },
    { id: 'RIDE', label: 'Wahana', icon: Zap },
    { id: 'STAY', label: 'Penginapan', icon: Tent },
    { id: 'FOOD', label: 'Cafe & Resto', icon: Utensils },
    { id: 'TREKKING', label: 'Trekking', icon: MapIcon },
    { id: 'PACKAGE', label: 'Paket Hemat', icon: Heart },
  ];

  useEffect(() => {
    if (showQR) {
      QRCode.toDataURL(showQR.url, { width: 300, margin: 2 }).then(setQRImageData);
    }
  }, [showQR]);

  useEffect(() => {
    Promise.all([
      fetch('/api/promotions').then(res => res.json()),
      fetch('/api/attractions').then(res => res.json())
    ]).then(([promoData, attrData]) => {
      setPromotions(promoData);
      setAttractions(attrData);
      setLoading(false);
    });
  }, []);

  // Auto-rotate carousel
  useEffect(() => {
    if (promotions.length === 0) return;
    const timer = setInterval(() => {
      setCurrentPromo(prev => (prev + 1) % promotions.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [promotions]);

  const filteredAttractions = attractions.filter(attr => {
    const matchesSearch = attr.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'ALL' || attr.category === activeCategory;
    
    // Additional sub-filter by tags if needed
    const tags = attr.tags?.toLowerCase() || '';
    const matchesFilter = activeFilter === 'ALL' || tags.includes(activeFilter.toLowerCase());

    return matchesSearch && matchesCategory && matchesFilter;
  });

  const getStatusBadge = (status: string, waitTime?: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <div className="flex flex-col items-end gap-1">
            <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 size={12} className="mr-1" /> Buka</Badge>
            {waitTime && <span className="text-[10px] font-bold bg-white/90 text-green-700 px-2 py-0.5 rounded-full shadow-sm">⏳ {waitTime}</span>}
          </div>
        );
      case 'MAINTENANCE':
        return <Badge variant="destructive"><AlertCircle size={12} className="mr-1" /> Pemeliharaan</Badge>;
      case 'CROWDED':
        return (
          <div className="flex flex-col items-end gap-1">
            <Badge className="bg-orange-500 hover:bg-orange-600"><Clock size={12} className="mr-1" /> Antrean Padat</Badge>
            {waitTime && <span className="text-[10px] font-bold bg-white/90 text-orange-700 px-2 py-0.5 rounded-full shadow-sm">⏳ {waitTime}</span>}
          </div>
        );
      default:
        return <Badge variant="secondary">Buka</Badge>;
    }
  };

  const renderBenefitIcons = (benefitsStr?: string) => {
    if (!benefitsStr) return null;
    try {
      const benefits = JSON.parse(benefitsStr);
      if (!Array.isArray(benefits)) return null;
      
      return (
        <div className="flex flex-wrap gap-2 mt-3">
          {benefits.slice(0, 4).map((b: string, i: number) => {
            const text = b.toLowerCase();
            let Icon = Ticket;
            if (text.includes('drink') || text.includes('minum')) Icon = Coffee;
            if (text.includes('photo') || text.includes('foto')) Icon = Camera;
            if (text.includes('meal') || text.includes('makan')) Icon = Utensils;
            if (text.includes('shuttle') || text.includes('wara-wiri')) Icon = Bus;
            if (text.includes('adrenalin') || text.includes('zip')) Icon = Zap;
            
            return (
              <div key={i} className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 shadow-sm" title={b}>
                <Icon size={10} className="text-brand" />
                <span className="text-[9px] font-bold text-gray-600 truncate max-w-[60px]">{b}</span>
              </div>
            );
          })}
          {benefits.length > 4 && <span className="text-[9px] font-bold text-gray-400 self-center">+{benefits.length - 4}</span>}
        </div>
      );
    } catch (e) {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto"></div>
          <p className="mt-4 text-gray-500 font-medium">Memuat informasi resort...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 px-4 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/icon.png" alt="Logo" className="h-10 w-auto" />
            <div>
              <h1 className="text-xl font-bold text-brand leading-none">THE LODGE MARIBAYA</h1>
              <p className="text-[10px] font-bold text-gray-400 tracking-widest mt-1">GREETER HUB PORTAL</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-50 rounded-full border border-blue-100">
              <CloudSun size={16} className="text-blue-500" />
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-tight">Cuaca Cerah • Wahana Beroperasi</span>
            </div>
            <nav className="flex gap-4 text-sm font-medium">
              <a href="#promo" className="text-gray-500 hover:text-brand transition-colors">Promo</a>
              <a href="#wahana" className="text-gray-500 hover:text-brand transition-colors">Wahana</a>
              <a href="#map" className="text-gray-500 hover:text-brand transition-colors">Peta</a>
            </nav>
            <Link href="/promo/ktp">
              <Button size="sm" className="bg-brand hover:bg-brand/90">
                Beli Tiket Promo
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8 space-y-16">
        
        {/* SECTION 1: THE LANDING HUB (PROMO) */}
        <section id="promo" className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black italic text-brand tracking-tight">1. THE LANDING HUB</h2>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowCompare(true)}
                className="rounded-full border-brand text-brand font-bold hover:bg-brand hover:text-white"
              >
                <ArrowRightLeft size={14} className="mr-2" /> Bandingkan Paket
              </Button>
              <Badge variant="outline" className="text-brand border-brand hidden sm:flex">Hot Deals Today</Badge>
            </div>
          </div>

          {/* Carousel */}
          {promotions.length > 0 && (
            <div className="relative h-[300px] md:h-[500px] rounded-3xl overflow-hidden shadow-2xl border-4 border-white group">
              {promotions.map((promo, idx) => (
                <div 
                  key={promo.id}
                  className={`absolute inset-0 transition-opacity duration-1000 ${idx === currentPromo ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                  <img src={promo.imageUrl} alt={promo.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-8 md:p-12 text-white">
                    <h3 className="text-3xl md:text-5xl font-black mb-2 uppercase tracking-tighter">{promo.title}</h3>
                  <p className="text-sm md:text-lg text-gray-200 max-w-2xl mb-6">{promo.description}</p>
                  {promo.linkUrl && (
                    <Link href={promo.linkUrl}>
                      <Button size="lg" className="w-fit bg-brand hover:bg-brand/90 text-white rounded-full font-bold px-8 shadow-xl">
                        Cek Detail Promo
                      </Button>
                    </Link>
                  )}
                </div>
                </div>
              ))}
              
              <button 
                onClick={() => setCurrentPromo(prev => (prev - 1 + promotions.length) % promotions.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-md p-3 rounded-full text-white transition-all opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                onClick={() => setCurrentPromo(prev => (prev + 1) % promotions.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-md p-3 rounded-full text-white transition-all opacity-0 group-hover:opacity-100"
              >
                <ChevronRight size={24} />
              </button>

              {/* Dots */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                {promotions.map((_, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setCurrentPromo(idx)}
                    className={`h-1.5 rounded-full transition-all ${idx === currentPromo ? 'w-8 bg-brand' : 'w-2 bg-white/50'}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Dynamic Promo Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {attractions.filter(a => a.originalPrice).map(attr => (
              <Card key={attr.id} className="group border-none shadow-lg hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden bg-white">
                <div className="relative h-48 overflow-hidden">
                  <img src={attr.imageUrl || '/placeholder.jpg'} alt={attr.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute top-3 left-3 bg-brand text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">PAHE (PAKET HEMAT)</div>
                </div>
                <CardContent className="p-5">
                  <h4 className="font-bold text-lg mb-1">{attr.name}</h4>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-brand font-black text-xl">Rp {attr.price.toLocaleString()}</span>
                    {attr.originalPrice && (
                      <span className="text-gray-400 line-through text-sm">Rp {attr.originalPrice.toLocaleString()}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">{attr.description}</p>
                  {renderBenefitIcons(attr.benefits)}
                  <div className="flex gap-2 mt-4">
                    <Button 
                      className="flex-1 rounded-xl bg-gray-100 text-gray-900 hover:bg-brand hover:text-white transition-colors border-none font-bold" 
                      variant="outline"
                    >
                      Jelaskan
                    </Button>
                    <Button 
                      onClick={() => setShowQR({ url: `${window.location.origin}/checkout/${attr.id}`, name: attr.name })}
                      className="rounded-xl bg-brand/10 text-brand hover:bg-brand hover:text-white border-none" 
                      size="icon"
                    >
                      <QrCode size={18} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* SECTION 2: PLAYGROUND HUB */}
        <section id="wahana" className="space-y-8">
          <div className="flex flex-col space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <h2 className="text-2xl font-black italic text-brand tracking-tight">2. PRODUCT EXPLORER</h2>
              
              <div className="flex flex-wrap gap-2">
                {['ALL', '#RamahAnak', '#Ekstrem', '#Instagramable', '#Grup'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => setActiveFilter(tag)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border-2 ${activeFilter === tag ? 'bg-brand border-brand text-white shadow-lg' : 'bg-white border-gray-200 text-gray-500 hover:border-brand'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-bold whitespace-nowrap transition-all border-2 ${activeCategory === cat.id ? 'bg-brand border-brand text-white shadow-xl scale-105' : 'bg-white border-gray-100 text-gray-500 hover:border-brand/30'}`}
                >
                  <cat.icon size={20} />
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search bar for Greeters */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama wahana..."
              className="w-full bg-white border-none shadow-sm rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-brand transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredAttractions.map(attr => (
              <div key={attr.id} className="flex flex-col space-y-4">
                {/* Reels Style Video Loop or Image */}
                <div className="relative aspect-[9/16] md:aspect-video rounded-3xl overflow-hidden shadow-xl bg-gray-200 group">
                  {attr.videoUrl ? (
                    <video 
                      src={attr.videoUrl}
                      autoPlay 
                      loop 
                      muted 
                      playsInline 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img src={attr.imageUrl || '/placeholder.jpg'} alt={attr.name} className="w-full h-full object-cover" />
                  )}
                  
                  {/* Status Overlay */}
                  <div className="absolute top-4 right-4">
                    {getStatusBadge(attr.status, attr.waitTime)}
                  </div>

                  {/* Video Indicator */}
                  {attr.videoUrl && (
                    <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded flex items-center gap-1">
                      <Play size={10} fill="white" /> LIVE ACTION
                    </div>
                  )}
                </div>

                <div className="px-2">
                  <h3 className="text-lg font-black uppercase tracking-tight">{attr.name}</h3>
                  <div className="flex gap-1 mt-1">
                    {attr.tags?.split(',').map(tag => (
                      <span key={tag} className="text-[10px] font-bold text-brand uppercase">{tag.trim()}</span>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-2 line-clamp-3 leading-relaxed">
                    {attr.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 3: INTERACTIVE MAP */}
        <section id="map" className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black italic text-brand tracking-tight">3. RESORT DIGITAL MAP</h2>
            <div className="flex gap-2">
              <Button size="icon" variant="outline" onClick={() => setZoom(prev => Math.min(prev + 0.2, 3))} className="rounded-full shadow-sm"><ZoomIn size={18} /></Button>
              <Button size="icon" variant="outline" onClick={() => setZoom(prev => Math.max(prev - 0.2, 1))} className="rounded-full shadow-sm"><ZoomOut size={18} /></Button>
              <Button size="icon" variant="outline" onClick={() => setZoom(1)} className="rounded-full shadow-sm"><Maximize2 size={18} /></Button>
            </div>
          </div>

          <Card className="rounded-[40px] overflow-hidden border-none shadow-2xl bg-white relative">
            <div className="overflow-auto max-h-[70vh] p-4 cursor-grab active:cursor-grabbing" ref={mapRef}>
              <div 
                className="transition-transform duration-300 origin-top-left"
                style={{ transform: `scale(${zoom})`, minWidth: '100%' }}
              >
                <img 
                  src="https://thelodgemaribaya.com/wp-content/uploads/2023/11/MAP-THE-LODGE-MARIBAYA.webp" 
                  alt="Resort Digital Map" 
                  className="w-full h-auto rounded-2xl"
                />
              </div>
            </div>
            
            {/* Map Legend (Floating) */}
            <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-gray-100 max-w-xs">
              <h4 className="text-xs font-bold text-brand uppercase mb-2">Petunjuk Arah</h4>
              <div className="space-y-2 text-[11px] font-medium">
                <div className="flex items-center gap-2 text-green-600"><div className="w-2 h-2 rounded-full bg-green-500" /> Area Glamping & Penginapan</div>
                <div className="flex items-center gap-2 text-blue-600"><div className="w-2 h-2 rounded-full bg-blue-500" /> Restoran & Cafe</div>
                <div className="flex items-center gap-2 text-orange-600"><div className="w-2 h-2 rounded-full bg-orange-500" /> Area Wahana & Playground</div>
              </div>
            </div>
          </Card>
        </section>

      </main>

      {/* Floating Bottom Nav for Greeters (Mobile) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-full px-6 py-3 md:hidden flex items-center gap-8 z-50">
        <a href="#promo" className="text-gray-400 hover:text-brand transition-colors"><Badge variant="outline">Promo</Badge></a>
        <a href="#wahana" className="text-gray-400 hover:text-brand transition-colors"><Badge variant="outline">Wahana</Badge></a>
        <a href="#map" className="text-gray-400 hover:text-brand transition-colors"><Badge variant="outline">Peta</Badge></a>
      </div>

      {/* MODALS */}
      
      {/* 1. QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowQR(null)} />
          <Card className="relative w-full max-w-sm bg-white rounded-[32px] overflow-hidden border-none shadow-2xl animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowQR(null)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"><X size={18} /></button>
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <Badge className="bg-brand/10 text-brand border-none font-bold mb-2">SCAN UNTUK BELI</Badge>
                <h3 className="text-xl font-black uppercase tracking-tight">{showQR.name}</h3>
              </div>
              <div className="bg-gray-50 p-4 rounded-3xl border-2 border-dashed border-gray-200 mb-6">
                {qrImageData ? (
                  <img src={qrImageData} alt="QR Code" className="w-full aspect-square rounded-xl" />
                ) : (
                  <div className="w-full aspect-square flex items-center justify-center"><Loader2 className="animate-spin text-brand" /></div>
                )}
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Tunjukkan QR Code ini kepada tamu. Tamu dapat melakukan scan untuk langsung menuju halaman pembayaran aman Xendit.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. Comparison Modal */}
      {showCompare && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCompare(false)} />
          <Card className="relative w-full max-w-4xl bg-white rounded-[32px] overflow-hidden border-none shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setShowCompare(false)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"><X size={20} /></button>
            <CardContent className="p-8 md:p-12">
              <div className="mb-8">
                <h3 className="text-3xl font-black italic text-brand tracking-tighter uppercase">Perbandingan Paket Wisata</h3>
                <p className="text-gray-500">Gunakan tabel ini untuk menjelaskan keuntungan paket terusan kepada tamu.</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-100">
                      <th className="py-4 px-4 text-xs font-black text-gray-400 uppercase tracking-widest">Fasilitas & Wahana</th>
                      <th className="py-4 px-4 text-center bg-gray-50/50"><Badge variant="outline" className="text-gray-500 border-gray-300">TIKET REGULER</Badge></th>
                      <th className="py-4 px-4 text-center bg-brand/5"><Badge className="bg-brand text-white border-none">PAKET TERUSAN</Badge></th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-bold">
                    {[
                      { name: 'Tiket Masuk Kawasan', reg: true, ter: true },
                      { name: 'Free Welcome Drink', reg: true, ter: true },
                      { name: 'Akses Wahana Sky Hammock', reg: false, ter: true },
                      { name: 'Akses Wahana Zip Bike', reg: false, ter: true },
                      { name: 'Akses Wahana Valley Swing', reg: false, ter: true },
                      { name: 'Akses Wahana Hot Air Balloon', reg: false, ter: true },
                      { name: 'Funicular (In & Out)', reg: false, ter: true },
                      { name: 'Meal Voucher (10k/50k)', reg: false, ter: true },
                      { name: 'Free 1 Soft File Photo', reg: false, ter: true },
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                        <td className="py-4 px-4 text-gray-700">{row.name}</td>
                        <td className="py-4 px-4 text-center bg-gray-50/50">{row.reg ? <CheckCircle2 size={18} className="mx-auto text-green-500" /> : <X size={18} className="mx-auto text-gray-300" />}</td>
                        <td className="py-4 px-4 text-center bg-brand/5">{row.ter ? <CheckCircle2 size={18} className="mx-auto text-brand" /> : <X size={18} className="mx-auto text-gray-300" />}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50/50">
                      <td className="py-6 px-4 text-gray-900 font-black italic uppercase">Total Value</td>
                      <td className="py-6 px-4 text-center text-lg text-gray-400 line-through">Rp 285.000</td>
                      <td className="py-6 px-4 text-center text-2xl text-brand font-black">Rp 165.000</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="mt-8 flex justify-end">
                <Button onClick={() => setShowCompare(false)} className="bg-brand hover:bg-brand/90 rounded-xl font-bold uppercase tracking-wider px-8 h-12">Mengerti, Tutup</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
