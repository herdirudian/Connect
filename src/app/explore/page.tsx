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
  Loader2,
  LayoutDashboard,
  Tent,
  Info,
  MapPin,
  Baby,
  Calculator,
  Plus,
  Minus
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
  images?: string; // JSON string
}

export default function GreeterHubPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [exploreSettings, setExploreSettings] = useState<any>(null);
  const [currentItinerary, setCurrentItinerary] = useState<any>(null);
  const [showAmenities, setShowAmenities] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcCategory, setCalcCategory] = useState('ALL');
  const [calcItems, setCalcItems] = useState<{ name: string, price: number, qty: number, category: string }[]>([]);
  const [showPreview, setShowPreview] = useState<{ type: 'image' | 'video', url: string, name: string, description?: string, gallery?: string[] } | null>(null);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPromo, setCurrentPromo] = useState(0);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [zoom, setZoom] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showQR, setShowQR] = useState<{ url: string; name: string } | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [qrImageData, setQRImageData] = useState<string>('');
  const [isOffline, setIsOffline] = useState(false);

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
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Set initial state
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Try to load from cache first
    const cachedPromo = localStorage.getItem('tlm_explore_promo');
    const cachedAttr = localStorage.getItem('tlm_explore_attr');
    const cachedSettings = localStorage.getItem('tlm_explore_settings');

    if (cachedPromo) setPromotions(JSON.parse(cachedPromo));
    if (cachedAttr) setAttractions(JSON.parse(cachedAttr));
    if (cachedSettings) setExploreSettings(JSON.parse(cachedSettings));

    Promise.all([
      fetch('/api/promotions').then(res => res.json()),
      fetch('/api/attractions').then(res => res.json()),
      fetch('/api/explore-settings').then(res => res.json())
    ]).then(([promoData, attrData, settingsData]) => {
      setPromotions(promoData);
      setAttractions(attrData);
      setExploreSettings(settingsData);
      setLoading(false);

      // Save to cache for offline use
      localStorage.setItem('tlm_explore_promo', JSON.stringify(promoData));
      localStorage.setItem('tlm_explore_attr', JSON.stringify(attrData));
      localStorage.setItem('tlm_explore_settings', JSON.stringify(settingsData));
    }).catch(err => {
      console.error('Failed to fetch data, using cache if available:', err);
      setLoading(false); // Stop loading even if it fails, so we can show cached data
    });
  }, []);

  useEffect(() => {
    if (exploreSettings?.itineraryData) {
      const itins = JSON.parse(exploreSettings.itineraryData);
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const found = itins.find((i: any) => currentTime >= i.startTime && currentTime <= i.endTime);
      setCurrentItinerary(found || itins[0]); // Default to first if none found
    }
  }, [exploreSettings]);

  useEffect(() => {
    if (exploreSettings?.calculatorData) {
      const items = JSON.parse(exploreSettings.calculatorData);
      setCalcItems(items.map((i: any) => ({ ...i, qty: 0 })));
    }
  }, [exploreSettings]);

  // Auto-rotate carousel
  useEffect(() => {
    if (promotions.length === 0) return;
    const timer = setInterval(() => {
      setCurrentPromo(prev => (prev + 1) % promotions.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [promotions]);

  const filteredAttractions = attractions.filter(attr => {
    // Filter by visibility (Explore Hub should show BOTH and EXPLORE)
    const isVisible = (attr as any).displayTarget === 'BOTH' || (attr as any).displayTarget === 'EXPLORE' || !(attr as any).displayTarget;
    if (!isVisible) return false;

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
            {isOffline && (
              <Badge className="bg-gray-500 animate-pulse text-white border-none px-3 py-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                  OFFLINE MODE
                </div>
              </Badge>
            )}
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border ${
              exploreSettings?.operationalStatus === 'WEATHER_DELAY' 
                ? 'bg-orange-50 border-orange-100 text-orange-700' 
                : exploreSettings?.operationalStatus === 'MAINTENANCE'
                ? 'bg-red-50 border-red-100 text-red-700'
                : 'bg-blue-50 border-blue-100 text-blue-700'
            }`}>
              <CloudSun size={16} className={exploreSettings?.operationalStatus === 'NORMAL' ? 'text-blue-500' : 'text-current'} />
              <span className="text-[10px] font-bold uppercase tracking-tight">
                {exploreSettings?.weatherInfo || 'Cerah'} • {exploreSettings?.statusMessage || 'Wahana Beroperasi'}
              </span>
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
        
        {/* Floating Quick Actions for Greeter */}
        <div className="fixed bottom-8 right-8 z-[90] flex flex-col gap-4">
          <Button 
            onClick={() => setShowCompare(true)}
            className="w-14 h-14 rounded-full bg-brand shadow-2xl hover:scale-110 transition-transform p-0"
          >
            <ArrowRightLeft className="text-white" size={24} />
          </Button>

          <Button 
            onClick={() => setShowCalculator(true)}
            className="w-14 h-14 rounded-full bg-orange-500 shadow-2xl hover:scale-110 transition-transform p-0"
          >
            <Calculator className="text-white" size={24} />
          </Button>
          
          <div className="relative group">
            <Button 
              onClick={() => setShowAmenities(!showAmenities)}
              className={`w-14 h-14 rounded-full shadow-2xl transition-all p-0 ${showAmenities ? 'bg-gray-900 scale-110' : 'bg-white text-gray-900 hover:bg-gray-50'}`}
            >
              <Info size={24} />
            </Button>
            
            {showAmenities && (
              <div className="absolute bottom-16 right-0 w-72 bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 animate-in slide-in-from-bottom-4 duration-300">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Nearby Amenities</h4>
                <div className="space-y-2">
                  {(exploreSettings?.amenitiesData ? JSON.parse(exploreSettings.amenitiesData) : []).map((amenity: any) => (
                    <div key={amenity.id} className="flex items-start gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors">
                      <div className="bg-brand/10 p-2 rounded-xl text-brand">
                        <MapPin size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">{amenity.name}</p>
                        <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{amenity.location}</p>
                      </div>
                    </div>
                  ))}
                  {(!exploreSettings?.amenitiesData || JSON.parse(exploreSettings.amenitiesData).length === 0) && (
                    <p className="text-[10px] text-gray-400 text-center py-4 italic">Belum ada data fasilitas.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

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
                  <img 
                    src={promo.imageUrl} 
                    alt={promo.title} 
                    className="w-full h-full object-cover cursor-zoom-in" 
                    onClick={() => setShowPreview({
                      type: 'image',
                      url: promo.imageUrl,
                      name: promo.title
                    })}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-8 md:p-12 text-white pointer-events-none">
                    <h3 className="text-3xl md:text-5xl font-black mb-2 uppercase tracking-tighter">{promo.title}</h3>
                  <p className="text-sm md:text-lg text-gray-200 max-w-2xl mb-6">{promo.description}</p>
                  {promo.linkUrl && (
                    <div className="pointer-events-auto">
                      <Link href={promo.linkUrl}>
                        <Button size="lg" className="w-fit bg-brand hover:bg-brand/90 text-white rounded-full font-bold px-8 shadow-xl">
                          Cek Detail Promo
                        </Button>
                      </Link>
                    </div>
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
                <div 
                  className="relative h-48 overflow-hidden cursor-zoom-in"
                  onClick={() => setShowPreview({
                    type: 'image',
                    url: attr.imageUrl || '/placeholder.jpg',
                    name: attr.name
                  })}
                >
                  <img src={attr.imageUrl || '/placeholder.jpg'} alt={attr.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute top-3 left-3 bg-brand text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">PAHE (PAKET HEMAT)</div>
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="text-white" size={24} />
                  </div>
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
                      onClick={() => setShowQR({ url: `https://family.thelodgegroup.id/booking/tickets`, name: attr.name })}
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
              
              {currentItinerary && (
                <div className="flex items-center gap-4 bg-brand/5 border border-brand/10 p-4 rounded-2xl animate-in slide-in-from-right duration-500">
                  <div className="bg-brand text-white p-2 rounded-xl shadow-lg">
                    <MapIcon size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-brand uppercase tracking-widest mb-0.5">Best Route Suggestion ({currentItinerary.startTime} - {currentItinerary.endTime})</p>
                    <p className="text-sm font-bold text-gray-900">{currentItinerary.route}</p>
                    <p className="text-[10px] text-gray-500 font-medium italic">💡 {currentItinerary.note}</p>
                  </div>
                </div>
              )}

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

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredAttractions.map(attr => (
              <div key={attr.id} className="flex flex-col space-y-3 group">
                {/* Reels Style Video Loop or Image */}
                <div 
                  className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg bg-gray-200 cursor-zoom-in"
                  onClick={() => {
                    let galleryImages: string[] = [];
                    try {
                      galleryImages = attr.images ? JSON.parse(attr.images) : [];
                      // If images is a comma-separated string instead of JSON array
                      if (typeof galleryImages === 'string') {
                        galleryImages = (galleryImages as string).split(',').map(s => s.trim());
                      }
                    } catch (e) {
                      galleryImages = attr.images ? attr.images.split(',').map(s => s.trim()) : [];
                    }

                    setShowPreview({ 
                      type: attr.videoUrl ? 'video' : 'image', 
                      url: attr.videoUrl || attr.imageUrl || '/placeholder.jpg',
                      name: attr.name,
                      gallery: galleryImages.length > 0 ? galleryImages : undefined
                    });
                    setActiveGalleryIndex(0);
                  }}
                >
                  {attr.videoUrl ? (
                    <video 
                      src={attr.videoUrl}
                      autoPlay 
                      loop 
                      muted 
                      playsInline 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <img 
                      src={
                        attr.imageUrl || 
                        (() => {
                          try {
                            const gallery = attr.images ? JSON.parse(attr.images) : [];
                            return Array.isArray(gallery) && gallery.length > 0 ? gallery[0] : '/placeholder.jpg';
                          } catch (e) {
                            return '/placeholder.jpg';
                          }
                        })()
                      } 
                      alt={attr.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    />
                  )}
                  
                  {/* Status Overlay */}
                  <div className="absolute top-4 right-4">
                    {getStatusBadge(attr.status, attr.waitTime)}
                  </div>

                  {/* Hover Action */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-white/20 backdrop-blur-md p-4 rounded-full border border-white/30">
                      <Maximize2 className="text-white" size={32} />
                    </div>
                  </div>

                  {/* Video Indicator */}
                  {attr.videoUrl && (
                    <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded flex items-center gap-1">
                      <Play size={10} fill="white" /> LIVE ACTION
                    </div>
                  )}
                </div>

                <div className="px-1">
                  <h3 className="text-sm md:text-base font-black uppercase tracking-tight line-clamp-1">{attr.name}</h3>
                  <div className="flex gap-1 mt-0.5">
                    {attr.tags?.split(',').slice(0, 2).map(tag => (
                      <span key={tag} className="text-[8px] md:text-[10px] font-bold text-brand uppercase">{tag.trim()}</span>
                    ))}
                  </div>
                  <p className="text-[10px] md:text-xs text-gray-500 mt-1 line-clamp-2 leading-snug">
                    {attr.description}
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full mt-3 h-8 text-[10px] font-bold border-brand/20 text-brand hover:bg-brand hover:text-white rounded-xl transition-all"
                    onClick={() => {
                      let galleryImages: string[] = [];
                      try {
                        galleryImages = attr.images ? JSON.parse(attr.images) : [];
                        if (typeof galleryImages === 'string') {
                          galleryImages = (galleryImages as string).split(',').map(s => s.trim());
                        }
                      } catch (e) {
                        galleryImages = attr.images ? attr.images.split(',').map(s => s.trim()) : [];
                      }

                      setShowPreview({ 
                        type: attr.videoUrl ? 'video' : 'image', 
                        url: attr.videoUrl || attr.imageUrl || (galleryImages.length > 0 ? galleryImages[0] : '/placeholder.jpg'),
                        name: attr.name,
                        description: attr.description,
                        gallery: galleryImages.length > 0 ? galleryImages : undefined
                      });
                      setActiveGalleryIndex(0);
                    }}
                  >
                    DETAIL INFO
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 3: EXPLORE AREA MAP */}
        <section id="peta" className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black italic text-brand tracking-tight">3. EXPLORE AREA MAP</h2>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setZoom(prev => Math.min(prev + 0.2, 3))}
                className="rounded-xl border-gray-200"
              >
                <ZoomIn size={20} />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.5))}
                className="rounded-xl border-gray-200"
              >
                <ZoomOut size={20} />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setZoom(1)}
                className="rounded-xl border-gray-200 text-xs font-bold"
              >
                RESET
              </Button>
            </div>
          </div>

          <Card className="rounded-[40px] overflow-hidden border-none shadow-2xl bg-gray-100 relative group min-h-[400px] md:min-h-[600px]">
            <div 
              ref={mapRef}
              className="w-full h-full flex items-center justify-center overflow-auto no-scrollbar cursor-zoom-in p-8"
              onClick={() => setShowPreview({ 
                type: 'image', 
                url: exploreSettings?.mapImageUrl || "/map-placeholder.jpg",
                name: "EXPLORE AREA MAP" 
              })}
            >
              <img 
                src={exploreSettings?.mapImageUrl || "/map-placeholder.jpg"} 
                alt="The Lodge Maribaya Map" 
                className="max-w-none transition-transform duration-300 shadow-2xl rounded-2xl"
                style={{ 
                  transform: `scale(${zoom})`,
                  width: '100%',
                  height: 'auto',
                  objectFit: 'contain'
                }}
              />
            </div>
            
            {/* Map Action Overlay */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md border border-white/30 px-6 py-3 rounded-full text-white text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 pointer-events-none">
              <Maximize2 size={14} /> Klik untuk Preview Layar Penuh
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
            <button onClick={() => setShowCompare(false)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors z-10"><X size={20} /></button>
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
                      <th className="py-4 px-4 text-center bg-gray-50/30"><Badge variant="outline" className="text-gray-400 border-gray-200">BASIC</Badge></th>
                      <th className="py-4 px-4 text-center bg-gray-50/80"><Badge variant="outline" className="text-gray-500 border-gray-300">REGULER</Badge></th>
                      <th className="py-4 px-4 text-center bg-brand/5"><Badge className="bg-brand text-white border-none">TERUSAN</Badge></th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-bold">
                    {(exploreSettings?.comparisonData ? JSON.parse(exploreSettings.comparisonData) : [
                      { name: 'Tiket Masuk Kawasan', bas: true, reg: true, ter: true },
                      { name: 'Free Welcome Drink', bas: false, reg: true, ter: true },
                      { name: 'Funicular (In & Out)', bas: false, reg: true, ter: true },
                      { name: 'Akses Wahana Sky Hammock', bas: false, reg: false, ter: true },
                      { name: 'Akses Wahana Zip Bike', bas: false, reg: false, ter: true },
                      { name: 'Akses Wahana Valley Swing', bas: false, reg: false, ter: true },
                      { name: 'Akses Wahana Hot Air Balloon', bas: false, reg: false, ter: true },
                      { name: 'Meal Voucher (10k/50k)', bas: false, reg: false, ter: true },
                      { name: 'Free 1 Soft File Photo', bas: false, reg: false, ter: true },
                    ]).map((row: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                        <td className="py-4 px-4 text-gray-700">{row.name}</td>
                        <td className="py-4 px-4 text-center bg-gray-50/30">{row.bas ? <CheckCircle2 size={18} className="mx-auto text-gray-400" /> : <X size={18} className="mx-auto text-gray-200" />}</td>
                        <td className="py-4 px-4 text-center bg-gray-50/80">{row.reg ? <CheckCircle2 size={18} className="mx-auto text-green-500" /> : <X size={18} className="mx-auto text-gray-300" />}</td>
                        <td className="py-4 px-4 text-center bg-brand/5">{row.ter ? <CheckCircle2 size={18} className="mx-auto text-brand" /> : <X size={18} className="mx-auto text-gray-300" />}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50/50">
                      <td className="py-6 px-4 text-gray-900 font-black italic uppercase">Total Value</td>
                      <td className="py-6 px-4 text-center">
                        {exploreSettings?.originalPriceBasic && (
                          <div className="text-xs text-gray-400 font-bold line-through decoration-red-500/50 decoration-2 mb-1">
                            {exploreSettings.originalPriceBasic.startsWith('Rp') ? '' : 'Rp '}{exploreSettings.originalPriceBasic}
                          </div>
                        )}
                        <div className="text-base text-gray-400 font-bold">{exploreSettings?.priceBasic || 'Rp 50.000'}</div>
                      </td>
                      <td className="py-6 px-4 text-center bg-gray-50/80">
                        {exploreSettings?.originalPriceReguler && (
                          <div className="text-xs text-gray-500 font-bold line-through decoration-red-500/50 decoration-2 mb-1">
                            {exploreSettings.originalPriceReguler.startsWith('Rp') ? '' : 'Rp '}{exploreSettings.originalPriceReguler}
                          </div>
                        )}
                        <div className="text-lg text-gray-500 font-black">{exploreSettings?.priceReguler || 'Rp 125.000'}</div>
                      </td>
                      <td className="py-6 px-4 text-center bg-brand/5 relative">
                        {exploreSettings?.originalPriceTerusan && (
                          <div className="flex flex-col items-center mb-1">
                            <span className="text-sm text-brand/40 font-bold line-through decoration-red-500 decoration-2">
                              {exploreSettings.originalPriceTerusan.startsWith('Rp') ? '' : 'Rp '}{exploreSettings.originalPriceTerusan}
                            </span>
                            <Badge className="mt-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0 rounded-full border-none animate-pulse">HEMAT BANGET!</Badge>
                          </div>
                        )}
                        <div className="text-2xl text-brand font-black">{exploreSettings?.priceTerusan || 'Rp 165.000'}</div>
                      </td>
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

      {/* 3. Full Screen Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 animate-in fade-in duration-300">
          <button 
            onClick={() => setShowPreview(null)} 
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all z-20"
          >
            <X size={24} />
          </button>
          
          <div className="w-full h-full flex flex-col items-center justify-center p-2 md:p-12">
            <div className="relative w-full max-w-7xl h-full flex items-center justify-center">
              {showPreview.gallery && showPreview.gallery.length > 0 ? (
                <div className="relative w-full h-full flex items-center justify-center group">
                  <img 
                    src={showPreview.gallery[activeGalleryIndex]} 
                    alt={`${showPreview.name} ${activeGalleryIndex + 1}`}
                    className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-500"
                  />
                  
                  {/* Gallery Navigation */}
                  {showPreview.gallery.length > 1 && (
                    <>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveGalleryIndex(prev => (prev - 1 + showPreview.gallery!.length) % showPreview.gallery!.length);
                        }}
                        className="absolute left-4 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all md:opacity-0 md:group-hover:opacity-100 z-30"
                      >
                        <ChevronLeft size={32} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveGalleryIndex(prev => (prev + 1) % showPreview.gallery!.length);
                        }}
                        className="absolute right-4 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all md:opacity-0 md:group-hover:opacity-100 z-30"
                      >
                        <ChevronRight size={32} />
                      </button>

                      {/* Thumbnails Indicator */}
                      <div className="absolute -bottom-16 md:-bottom-20 flex gap-2 overflow-x-auto p-2 no-scrollbar max-w-full z-30">
                        {showPreview.gallery.map((img, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveGalleryIndex(idx)}
                            className={`relative w-12 h-12 md:w-16 md:h-16 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${activeGalleryIndex === idx ? 'border-brand scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'}`}
                          >
                            <img src={img} className="w-full h-full object-cover" alt="thumb" />
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : showPreview.type === 'video' ? (
                <video 
                  src={showPreview.url} 
                  autoPlay 
                  loop 
                  controls 
                  className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl"
                />
              ) : (
                <img 
                  src={showPreview.url} 
                  alt={showPreview.name} 
                  className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" 
                />
              )}
            </div>
            <div className={`text-center max-w-2xl px-6 ${showPreview.gallery ? 'mt-24 md:mt-32' : 'mt-6'}`}>
              <h3 className="text-xl md:text-4xl font-black text-white uppercase tracking-tighter italic">{showPreview.name}</h3>
              <p className="text-gray-400 text-[10px] md:text-sm mt-2 font-bold tracking-widest uppercase">
                {showPreview.gallery ? `PHOTO ${activeGalleryIndex + 1} OF ${showPreview.gallery.length}` : 'THE LODGE MARIBAYA • EXPERIENCE PREVIEW'}
              </p>
              
              {showPreview.description && (
                <div className="mt-4 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 max-h-32 overflow-y-auto no-scrollbar">
                  <p className="text-gray-300 text-xs md:text-sm leading-relaxed text-center">
                    {showPreview.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* 4. Group Calculator Modal */}
      {showCalculator && (
        <div className="fixed inset-0 z-[115] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCalculator(false)} />
          <Card className="relative w-full max-w-lg bg-white rounded-[32px] overflow-hidden border-none shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setShowCalculator(false)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors z-10"><X size={20} /></button>
            <CardContent className="p-8">
              <div className="mb-6">
                <h3 className="text-2xl font-black italic text-orange-600 tracking-tighter uppercase">Group Calculator</h3>
                <p className="text-gray-500 text-sm">Simulasi harga untuk tamu rombongan.</p>
              </div>

              {/* Category Filter Tabs for Calculator */}
              <div className="flex overflow-x-auto pb-4 mb-4 gap-2 no-scrollbar">
                {['ALL', ...Array.from(new Set(calcItems.map(i => i.category)))].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCalcCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 whitespace-nowrap ${
                      calcCategory === cat 
                        ? 'bg-orange-500 border-orange-500 text-white shadow-lg' 
                        : 'bg-white border-gray-100 text-gray-400 hover:border-orange-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2 no-scrollbar">
                {/* Group by Category Dynamically */}
                {Array.from(new Set(calcItems.map(i => i.category)))
                  .filter(cat => calcCategory === 'ALL' || calcCategory === cat)
                  .map(cat => {
                    const items = calcItems.filter(i => i.category === cat);
                    if (items.length === 0) return null;

                    return (
                      <div key={cat} className="space-y-3">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">{cat || 'LAINNYA'}</h4>
                        <div className="space-y-2">
                          {items.map((item) => {
                            const idx = calcItems.findIndex(i => i.name === item.name && i.category === item.category);
                            return (
                              <div key={`${cat}-${idx}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                <div className="flex-1">
                                  <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                                  <p className="text-[10px] text-gray-500 font-medium">Rp {item.price.toLocaleString('id-ID')}</p>
                                </div>
                                <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
                                  <button 
                                    onClick={() => {
                                      const newItems = [...calcItems];
                                      newItems[idx].qty = Math.max(0, newItems[idx].qty - 1);
                                      setCalcItems(newItems);
                                    }}
                                    className="text-gray-400 hover:text-orange-500 transition-colors"
                                  >
                                    <Minus size={14} />
                                  </button>
                                  <span className="w-6 text-center font-black text-gray-900 text-sm">{item.qty}</span>
                                  <button 
                                    onClick={() => {
                                      const newItems = [...calcItems];
                                      newItems[idx].qty += 1;
                                      setCalcItems(newItems);
                                    }}
                                    className="text-gray-400 hover:text-orange-500 transition-colors"
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="mt-8 p-6 bg-orange-50 rounded-[24px] border border-orange-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-orange-600 uppercase tracking-widest">Total Estimasi</span>
                  <span className="text-xs font-medium text-orange-400 italic">*{calcItems.reduce((acc, i) => acc + i.qty, 0)} items</span>
                </div>
                <div className="text-3xl font-black text-orange-700">
                  Rp {calcItems.reduce((acc, i) => acc + (i.price * i.qty), 0).toLocaleString('id-ID')}
                </div>
              </div>

              <Button 
                onClick={() => {
                  setCalcItems(calcItems.map(i => ({ ...i, qty: 0 })));
                }} 
                variant="ghost" 
                className="w-full mt-4 text-gray-400 text-xs font-bold uppercase tracking-widest hover:text-orange-500"
              >
                Reset Hitungan
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
