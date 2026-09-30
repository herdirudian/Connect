'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Star, ArrowLeft, MapPin, AlertCircle, RefreshCw, Clock } from 'lucide-react';
import Image from 'next/image';
import { PublicBookingDialog } from '@/components/PublicBookingDialog';
import { ReviewsListDialog } from '@/components/reviews/reviews-list-dialog';
import Link from 'next/link';

interface AttractionEvent {
  id: string;
  name: string;
  description: string;
  category?: string;
  price: number;
  benefits: string;
  imageUrl?: string;
  active: boolean;
  originalPrice?: number;
  rating?: number;
  displayTarget?: string;
  isEvent?: boolean;
  eventDate?: string | null;
  eventMaxQuota?: number | null;
  eventSoldQuota?: number | null;
  eventPromoPrice?: number | null;
  eventPromoQuota?: number | null;
  waitTime?: string;
}

export default function PublicEventsPage() {
  const [events, setEvents] = useState<AttractionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<AttractionEvent | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/attractions', { cache: 'no-store' });
      if (!res.ok) throw new Error('Gagal memuat data event');
      const data: AttractionEvent[] = await res.json();
      
      const filtered = (Array.isArray(data) ? data : []).filter((item) => {
        const isEventItem = item.category === 'EVENT' || item.isEvent === true;
        const isVisible = item.displayTarget === 'BOTH' || item.displayTarget === 'BOOKING' || !item.displayTarget;
        return item.active && isEventItem && isVisible;
      });

      filtered.sort((a, b) => {
        if (a.eventDate && b.eventDate) {
          return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
        }
        if (a.eventDate) return -1;
        if (b.eventDate) return 1;
        return 0;
      });

      setEvents(filtered);
    } catch (err: any) {
      console.error('Error fetching events:', err);
      setError('Terjadi kendala saat memuat daftar event. Silakan coba kembali.');
    } finally {
      setLoading(false);
    }
  }

  const handleBook = (item: AttractionEvent) => {
    setSelectedItem(item);
    setIsBookingOpen(true);
  };

  const handleShowReviews = (item: AttractionEvent) => {
    setReviewTarget({ id: item.id, name: item.name });
    setReviewsOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8 pb-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-6">
          <div className="flex items-center gap-4">
            <Link href="/booking" aria-label="Kembali ke menu booking">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-gray-200 text-gray-700 min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-brand"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-brand-dark uppercase tracking-tight">
                Events
              </h1>
              <p className="text-gray-600 font-medium mt-1 text-sm md:text-base">
                Temukan dan pesan tiket event spesial di The Lodge Maribaya.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/booking/tickets">
              <Button
                variant="outline"
                className="border-brand text-brand hover:bg-brand/5 font-bold text-xs uppercase tracking-wider h-10 rounded-xl"
              >
                Lihat Tiket & Wahana Regular
              </Button>
            </Link>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 animate-pulse"
              >
                <div className="h-52 bg-gray-200 rounded-xl w-full" />
                <div className="h-6 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-10 bg-gray-200 rounded w-full mt-4" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-xl mx-auto space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <p className="text-red-700 font-semibold">{error}</p>
            <Button
              onClick={fetchEvents}
              className="bg-brand-dark hover:bg-brand text-white font-bold rounded-xl gap-2 min-h-[44px]"
            >
              <RefreshCw className="h-4 w-4" /> Coba Lagi
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && events.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center max-w-2xl mx-auto shadow-sm space-y-5">
            <div className="w-20 h-20 bg-brand-50 text-brand rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Calendar className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Belum Ada Event Aktif</h3>
              <p className="text-gray-500 font-medium text-sm md:text-base leading-relaxed">
                Saat ini belum ada jadwal event atau festival yang dibuka untuk umum. Anda tetap dapat memesan tiket
                wisata reguler dan wahana petualangan seru kami.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/booking/tickets">
                <Button className="w-full sm:w-auto bg-brand-dark hover:bg-brand text-white font-bold h-12 px-6 rounded-xl shadow-md">
                  Pesan Tiket & Wahana
                </Button>
              </Link>
              <Link href="https://wa.me/628112253299" target="_blank" rel="noopener noreferrer">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-100 font-bold h-12 px-6 rounded-xl"
                >
                  Tanya CS WhatsApp
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Event Cards Grid */}
        {!loading && !error && events.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((item) => {
              let benefits: string[] = [];
              try {
                benefits = JSON.parse(item.benefits || '[]');
              } catch {
                benefits = [];
              }

              const hasEarlyBird =
                Boolean(item.eventPromoQuota) &&
                (item.eventPromoQuota || 0) > 0 &&
                (item.eventSoldQuota || 0) < (item.eventPromoQuota || 0);

              const earlyBirdLeft = hasEarlyBird
                ? (item.eventPromoQuota || 0) - (item.eventSoldQuota || 0)
                : 0;

              const currentPrice =
                hasEarlyBird && item.eventPromoPrice ? item.eventPromoPrice : item.price;

              const currentOriginalPrice =
                hasEarlyBird && item.eventPromoPrice ? item.price : item.originalPrice;

              const isSoldOut =
                Boolean(item.eventMaxQuota) &&
                (item.eventMaxQuota || 0) > 0 &&
                (item.eventSoldQuota || 0) >= (item.eventMaxQuota || 0);

              const formattedDate = item.eventDate
                ? new Date(item.eventDate).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : null;

              return (
                <Card
                  key={item.id}
                  className="group hover:shadow-xl transition-all duration-300 border-gray-100 shadow-md overflow-hidden flex flex-col h-full rounded-2xl bg-white relative"
                >
                  {/* Event Thumbnail */}
                  <div className="h-60 bg-gray-100 relative overflow-hidden flex items-center justify-center group-hover:bg-brand-50/40 transition-colors">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-gray-400 group-hover:text-brand transition-colors shadow-sm">
                        <Calendar className="h-10 w-10" />
                      </div>
                    )}

                    {/* Category Tag */}
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-black text-brand-dark shadow-sm border border-gray-100 uppercase tracking-wider">
                      EVENT
                    </div>

                    {/* Early Bird Ribbon */}
                    {hasEarlyBird && !isSoldOut && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-red-600 to-amber-600 text-white px-4 py-2 text-xs font-black tracking-wide text-center shadow-md">
                        🔥 EARLY BIRD PROMO: SISA {earlyBirdLeft} TIKET!
                      </div>
                    )}

                    {/* Sold Out Banner */}
                    {isSoldOut && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="bg-red-600 text-white text-sm font-black px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                          Tiket Habis (Sold Out)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Header */}
                  <CardHeader className="pb-2 pt-6 px-6">
                    <CardTitle className="text-xl font-black text-gray-900 leading-snug uppercase tracking-tight">
                      {item.name}
                    </CardTitle>

                    {/* Date Badge */}
                    {formattedDate && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-brand bg-brand/10 w-fit px-2.5 py-1 rounded-md border border-brand/20">
                        <Calendar className="h-3.5 w-3.5 text-brand flex-shrink-0" />
                        <span>{formattedDate}</span>
                      </div>
                    )}

                    {/* Operational Time & Location */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 font-medium mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-gray-400" /> {item.waitTime || '09:00 - 17:00 WIB'}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" /> The Lodge Maribaya
                      </span>
                    </div>

                    {/* Rating and Reviews */}
                    <div
                      className="flex items-center gap-1 mt-2 cursor-pointer hover:bg-gray-100 p-1 -ml-1 rounded-lg w-fit transition-colors"
                      onClick={() => handleShowReviews(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleShowReviews(item)}
                      aria-label={`Lihat ulasan untuk ${item.name}`}
                    >
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-bold text-gray-900 text-sm">
                        {item.rating?.toFixed(1) || '0.0'}
                      </span>
                      <span className="text-xs text-gray-500 font-medium ml-1">Lihat Ulasan</span>
                    </div>

                    {/* Pricing */}
                    <div className="mt-3">
                      {currentOriginalPrice && currentOriginalPrice > currentPrice && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-gray-400 line-through font-semibold">
                            {new Intl.NumberFormat('id-ID', {
                              style: 'currency',
                              currency: 'IDR',
                              maximumFractionDigits: 0,
                            }).format(currentOriginalPrice)}
                          </span>
                          <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">
                            {Math.round(
                              ((currentOriginalPrice - currentPrice) / currentOriginalPrice) * 100
                            )}
                            % OFF
                          </span>
                        </div>
                      )}
                      <div className="flex items-baseline">
                        <span className="text-2xl font-black text-brand-dark">
                          {new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                            maximumFractionDigits: 0,
                          }).format(currentPrice)}
                        </span>
                        <span className="text-xs text-gray-400 font-bold uppercase ml-1">/ Orang</span>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Card Content & Benefits */}
                  <CardContent className="flex-1 flex flex-col px-6 pb-6">
                    <p className="text-gray-600 mb-5 text-sm font-medium leading-relaxed">
                      {item.description}
                    </p>

                    {benefits.length > 0 && (
                      <div className="mb-6 bg-brand-50/50 p-4 rounded-xl border border-brand-100/70">
                        <p className="text-xs font-black text-brand-dark uppercase tracking-wider mb-2.5">
                          What's Included
                        </p>
                        <ul className="space-y-2">
                          {benefits.map((b: string, i: number) => (
                            <li
                              key={i}
                              className="text-xs font-semibold text-gray-700 flex items-start gap-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 flex-shrink-0" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Book Now Button */}
                    <Button
                      disabled={isSoldOut}
                      className="w-full mt-auto bg-brand-dark hover:bg-brand text-white font-bold uppercase tracking-wider h-12 rounded-xl shadow-lg shadow-brand/10 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                      onClick={() =>
                        handleBook({
                          ...item,
                          price: currentPrice,
                          originalPrice: currentOriginalPrice,
                        })
                      }
                    >
                      {isSoldOut ? 'Tiket Habis' : 'Pesan Tiket Event'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Public Booking Dialog */}
        <PublicBookingDialog
          item={
            selectedItem
              ? {
                  id: selectedItem.id,
                  name: selectedItem.name,
                  price: selectedItem.price,
                  originalPrice: selectedItem.originalPrice,
                  type: 'WAHANA',
                  isEvent: true,
                  eventDate: selectedItem.eventDate,
                  eventPromoPrice: selectedItem.eventPromoPrice,
                  eventPromoQuota: selectedItem.eventPromoQuota,
                  eventSoldQuota: selectedItem.eventSoldQuota,
                  normalPrice: events.find((e) => e.id === selectedItem.id)?.price,
                }
              : null
          }
          allItems={events.map((e) => {
            const hasEB =
              Boolean(e.eventPromoQuota) &&
              (e.eventPromoQuota || 0) > 0 &&
              (e.eventSoldQuota || 0) < (e.eventPromoQuota || 0);

            return {
              id: e.id,
              name: e.name,
              price: hasEB && e.eventPromoPrice ? e.eventPromoPrice : e.price,
              originalPrice: hasEB && e.eventPromoPrice ? e.price : e.originalPrice,
              type: 'WAHANA',
              isEvent: true,
              eventDate: e.eventDate,
              eventPromoPrice: e.eventPromoPrice,
              eventPromoQuota: e.eventPromoQuota,
              eventSoldQuota: e.eventSoldQuota,
              normalPrice: e.price,
            };
          })}
          open={isBookingOpen}
          onOpenChange={setIsBookingOpen}
        />

        {/* Reviews List Dialog */}
        <ReviewsListDialog
          open={reviewsOpen}
          onOpenChange={setReviewsOpen}
          targetId={reviewTarget?.id || ''}
          targetName={reviewTarget?.name || ''}
          type="attraction"
        />
      </div>
    </div>
  );
}
