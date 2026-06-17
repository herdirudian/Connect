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
  Maximize2
} from 'lucide-react';
import Link from 'next/link';

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
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  videoUrl?: string;
  status: 'OPEN' | 'MAINTENANCE' | 'CROWDED';
  tags?: string;
  benefits?: string;
}

export default function GreeterHubPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPromo, setCurrentPromo] = useState(0);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [zoom, setZoom] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const mapRef = useRef<HTMLDivElement>(null);

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
    const tags = attr.tags?.toLowerCase() || '';
    if (activeFilter === 'ALL') return matchesSearch;
    return matchesSearch && tags.includes(activeFilter.toLowerCase());
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 size={12} className="mr-1" /> Buka</Badge>;
      case 'MAINTENANCE':
        return <Badge variant="destructive"><AlertCircle size={12} className="mr-1" /> Pemeliharaan</Badge>;
      case 'CROWDED':
        return <Badge className="bg-orange-500 hover:bg-orange-600"><Clock size={12} className="mr-1" /> Antrean Padat</Badge>;
      default:
        return <Badge variant="secondary">Buka</Badge>;
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
            <Badge variant="outline" className="text-brand border-brand">Hot Deals Today</Badge>
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
                  <p className="text-xs text-gray-500 line-clamp-2 mb-4">{attr.description}</p>
                  <Button className="w-full rounded-xl bg-gray-100 text-gray-900 hover:bg-brand hover:text-white transition-colors border-none font-bold" variant="outline">Jelaskan ke Tamu</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* SECTION 2: PLAYGROUND HUB */}
        <section id="wahana" className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h2 className="text-2xl font-black italic text-brand tracking-tight">2. PLAYGROUND HUB</h2>
            
            <div className="flex flex-wrap gap-2">
              {['ALL', '#RamahAnak', '#Ekstrem', '#Instagramable'].map(tag => (
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
                    {getStatusBadge(attr.status)}
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
    </div>
  );
}
