'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Ticket, Star, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { PublicBookingDialog } from '@/components/PublicBookingDialog';
import { ReviewsListDialog } from '@/components/reviews/reviews-list-dialog';
import Link from 'next/link';

interface Attraction {
  id: string;
  name: string;
  description: string;
  price: number;
  benefits: string; // JSON string
  imageUrl?: string;
  active: boolean;
  originalPrice?: number;
  rating?: number;
}

export default function PublicTicketsPage() {
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Attraction | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{id: string, name: string} | null>(null);

  useEffect(() => {
    fetchAttractions();
  }, []);

  async function fetchAttractions() {
    try {
      const res = await fetch('/api/attractions', { cache: 'no-store' });
      const data = await res.json();
      setAttractions(data);
    } catch (error) {
      console.error('Error fetching attractions:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleBook = (item: Attraction) => {
    setSelectedItem(item);
    setIsBookingOpen(true);
  };

  const handleShowReviews = (item: Attraction) => {
    setReviewTarget({ id: item.id, name: item.name });
    setReviewsOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
       <div className="max-w-7xl mx-auto space-y-8 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-6">
            <div className="flex items-center gap-4">
                <Link href="/booking">
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <ArrowLeft />
                    </Button>
                </Link>
                <div>
                    <h2 className="text-3xl font-black text-brand-dark uppercase tracking-tight">Tickets & Wahana</h2>
                    <p className="text-gray-500 font-medium mt-1">Explore our exciting attractions and rides.</p>
                </div>
            </div>
        </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {attractions.filter(item => item.active).map((item) => {
           let benefits = [];
           try {
             benefits = JSON.parse(item.benefits || '[]');
           } catch (e) {
             benefits = [];
           }

           return (
            <Card key={item.id} className="group hover:shadow-xl transition-all duration-300 border-gray-100 shadow-md overflow-hidden flex flex-col h-full rounded-2xl bg-white">
              <div className="h-56 bg-gray-100 relative overflow-hidden flex items-center justify-center group-hover:bg-brand-50/50 transition-colors">
                 {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                 ) : (
                     <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-gray-400 group-hover:text-brand transition-colors shadow-sm">
                        <Ticket className="h-10 w-10" />
                     </div>
                 )}
                 <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-black text-brand-dark shadow-sm border border-gray-100">
                    ADVENTURE
                 </div>
              </div>
              <CardHeader className="pb-2 pt-6 px-6">
                <div className="flex justify-between items-start gap-4">
                  <CardTitle className="text-xl font-black text-gray-900 leading-tight uppercase tracking-tight">{item.name}</CardTitle>
                </div>
                <div 
                  className="flex items-center gap-1 mt-1 cursor-pointer hover:bg-gray-50 p-1 -ml-1 rounded-lg w-fit transition-colors"
                  onClick={() => handleShowReviews(item)}
                >
                   <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                   <span className="font-bold text-gray-900 text-sm">{item.rating?.toFixed(1) || '0.0'}</span>
                   <span className="text-xs text-gray-500 font-medium ml-1">See Reviews</span>
                </div>
                <div className="mt-2">
                  {item.originalPrice && item.originalPrice > item.price && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-gray-400 line-through font-semibold">
                         {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.originalPrice)}
                      </span>
                      <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">
                         {Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}% OFF
                      </span>
                    </div>
                  )}
                  <span className="text-2xl font-black text-brand-dark">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.price)}
                  </span>
                  <span className="text-xs text-gray-400 font-bold uppercase ml-1">/ Person</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col px-6 pb-6">
                <p className="text-gray-500 mb-6 text-sm font-medium leading-relaxed">{item.description}</p>
                
                {benefits.length > 0 && (
                  <div className="mb-6 bg-brand-50/50 p-4 rounded-xl border border-brand-50">
                    <p className="text-xs font-black text-brand uppercase tracking-wider mb-3">What's Included</p>
                    <ul className="space-y-2">
                      {benefits.map((b: string, i: number) => (
                        <li key={i} className="text-xs font-semibold text-gray-600 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 flex-shrink-0"></span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button 
                  className="w-full mt-auto bg-brand-dark hover:bg-brand text-white font-bold uppercase tracking-wider h-12 rounded-xl shadow-lg shadow-brand/10"
                  onClick={() => handleBook(item)}
                >
                  Book Now
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <PublicBookingDialog 
        item={selectedItem ? { 
            id: selectedItem.id, 
            name: selectedItem.name, 
            price: selectedItem.price, 
            originalPrice: selectedItem.originalPrice,
            type: 'WAHANA' 
        } : null}
        allItems={attractions.filter(a => a.active).map(a => ({
            id: a.id,
            name: a.name,
            price: a.price,
            originalPrice: a.originalPrice,
            type: 'WAHANA'
        }))}
        open={isBookingOpen}
        onOpenChange={setIsBookingOpen}
      />

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
