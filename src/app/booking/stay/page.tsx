'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tent, Star, Users, Calendar, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { PublicBookingDialog } from '@/components/PublicBookingDialog';
import Link from 'next/link';
import { ReviewList } from '@/components/reviews/review-list';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AccommodationDetailsDialog } from '@/components/AccommodationDetailsDialog';

interface Accommodation {
  id: string;
  name: string;
  capacity: string;
  price: number;
  originalPrice?: number;
  description: string;
  rating: number;
  benefits: string;
  imageUrl?: string;
  images?: string[]; 
  active: boolean;
  availability?: number;
}

export default function PublicStayPage() {
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Accommodation | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<Accommodation | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  const getLocalDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [searchDate, setSearchDate] = useState<string>(getLocalDateString());
  const [checkedDate, setCheckedDate] = useState<string>(getLocalDateString());
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [reviewTargetId, setReviewTargetId] = useState<string | null>(null);

  useEffect(() => {
    fetchAccommodations();
  }, []); 

  async function fetchAccommodations() {
    setLoading(true);
    try {
      const res = await fetch(`/api/accommodations?date=${searchDate}`);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setAccommodations(data);
      } else {
        setAccommodations([]);
      }
      setCheckedDate(searchDate);
    } catch (error) {
      console.error('Error fetching accommodations:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleBook = (item: Accommodation) => {
    setSelectedItem(item);
    setIsBookingOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
       <div className="max-w-7xl mx-auto space-y-8 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
              <Link href="/booking">
                  <Button variant="ghost" size="icon" className="rounded-full">
                      <ArrowLeft />
                  </Button>
              </Link>
              <div>
                <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">Staycation</h2>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mt-1">Unforgettable nights in nature.</p>
              </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-100 shadow-sm flex-1 sm:flex-initial">
             <div className="relative flex-1 sm:w-48">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input 
                   type="date" 
                   value={searchDate}
                   onChange={(e) => setSearchDate(e.target.value)}
                   min={getLocalDateString()}
                   className="pl-9 bg-transparent border-none focus-visible:ring-0 h-10 w-full"
                />
             </div>
             <Button onClick={fetchAccommodations} disabled={loading} className="rounded-lg shadow-none shrink-0 px-4">
               {loading ? <span className="animate-spin mr-2">⏳</span> : null}
               Check Availability
             </Button>
            </div>
          </div>
        </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {accommodations.filter(a => a.active).map((item) => {
          let benefits = [];
          try {
            benefits = JSON.parse(item.benefits || '[]');
          } catch (e) {
            benefits = [];
          }

          const hasStock = (item.availability ?? 0) > 0;

          return (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
              <div className="h-48 bg-orange-50 relative flex items-center justify-center overflow-hidden">
                 {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                 ) : (
                    <Tent className="h-12 w-12 text-orange-400" />
                 )}
                 <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                    {item.originalPrice && item.originalPrice > item.price && (
                        <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                            {Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}% OFF
                        </span>
                    )}
                    <div className="bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold flex flex-col items-end">
                        {item.originalPrice && item.originalPrice > item.price && (
                            <span className="text-[10px] line-through text-gray-300">
                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.originalPrice)}
                            </span>
                        )}
                        <span>
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.price)}/night
                        </span>
                    </div>
                 </div>
              </div>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{item.name}</CardTitle>
                  <button 
                    onClick={() => {
                      setReviewTargetId(item.id);
                      setReviewsOpen(true);
                    }}
                    className="flex items-center gap-1 text-amber-500 hover:text-amber-600 hover:underline"
                  >
                    <Star size={16} fill="currentColor" />
                    <span className="text-sm font-medium">{item.rating.toFixed(1)}</span>
                  </button>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                  <Users size={16} />
                  <span>{item.capacity}</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4 text-sm line-clamp-2">{item.description}</p>
                
                {benefits.length > 0 && (
                  <div className="mb-4 bg-orange-50 p-3 rounded-md">
                    <p className="text-xs font-semibold text-orange-800 mb-1">FACILITIES:</p>
                    <ul className="text-xs text-gray-700 list-disc pl-4 space-y-1">
                      {benefits.slice(0, 3).map((b: string, i: number) => (
                        <li key={i}>{b}</li>
                      ))}
                      {benefits.length > 3 && <li>+{benefits.length - 3} more</li>}
                    </ul>
                  </div>
                )}

                <div className="flex flex-col gap-2 mt-auto">
                   <Button 
                     variant="outline" 
                     className="w-full border-brand text-brand hover:bg-brand hover:text-white"
                     onClick={() => {
                        setDetailItem(item);
                        setIsDetailsOpen(true);
                     }}
                   >
                     Selengkapnya
                   </Button>
                   <Button 
                     className="w-full font-bold" 
                     onClick={() => handleBook(item)}
                     disabled={!hasStock}
                     variant={hasStock ? 'primary' : 'secondary'}
                   >
                     {item.availability !== undefined ? (
                       hasStock ? `Book Now (Sisa ${item.availability})` : 'Full Booked'
                     ) : 'Loading...'}
                   </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AccommodationDetailsDialog
        item={detailItem}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onBook={handleBook}
      />

      <PublicBookingDialog 
        item={selectedItem ? { 
            id: selectedItem.id, 
            name: selectedItem.name, 
            price: selectedItem.price, 
            originalPrice: selectedItem.originalPrice,
            type: 'GLAMPING',
            availability: selectedItem.availability
        } : null} 
        allItems={accommodations.filter(a => a.active).map(a => ({
            id: a.id,
            name: a.name,
            price: a.price,
            originalPrice: a.originalPrice,
            type: 'GLAMPING',
            availability: a.availability
        }))}
        open={isBookingOpen} 
        onOpenChange={setIsBookingOpen}
        initialDate={checkedDate}
        maxQty={selectedItem?.availability}
      />

      <Dialog open={reviewsOpen} onOpenChange={setReviewsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Guest Reviews</DialogTitle>
          </DialogHeader>
          {reviewTargetId && <ReviewList accommodationId={reviewTargetId} />}
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
