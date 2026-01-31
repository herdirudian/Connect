'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Star, Users, Tent, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  images?: string[] | any; // Handle Json type
  active: boolean;
  availability?: number;
}

interface AccommodationDetailsDialogProps {
  item: Accommodation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBook: (item: Accommodation) => void;
}

export function AccommodationDetailsDialog({ item, open, onOpenChange, onBook }: AccommodationDetailsDialogProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!item) return null;

  // Prepare images array
  let images: string[] = [];
  if (Array.isArray(item.images)) {
    images = item.images;
  } else if (item.imageUrl) {
    images = [item.imageUrl];
  }

  // Parse benefits
  let benefits: string[] = [];
  try {
    benefits = JSON.parse(item.benefits || '[]');
  } catch (e) {
    benefits = [];
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const hasMultipleImages = images.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden gap-0 rounded-2xl max-h-[90vh] flex flex-col md:flex-row">
        {/* Image Slider Section */}
        <div className="relative w-full md:w-1/2 h-64 md:h-auto bg-gray-100 flex-shrink-0">
          {images.length > 0 ? (
            <Image
              src={images[currentImageIndex]}
              alt={`${item.name} - Image ${currentImageIndex + 1}`}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <Tent size={48} />
            </div>
          )}

          {hasMultipleImages && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-md transition-colors z-10"
              >
                <ChevronLeft size={20} className="text-gray-800" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-md transition-colors z-10"
              >
                <ChevronRight size={20} className="text-gray-800" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {images.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
          
          {/* Price Badge Overlay for Mobile */}
          <div className="absolute top-4 right-4 md:hidden">
             <Badge className="bg-white/90 text-brand-dark hover:bg-white backdrop-blur-sm text-sm font-bold shadow-sm border-none">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.price)}
             </Badge>
          </div>
        </div>

        {/* Details Section */}
        <div className="p-6 md:p-8 flex flex-col w-full md:w-1/2 overflow-y-auto max-h-[50vh] md:max-h-[80vh]">
          <div className="mb-6">
            <div className="flex justify-between items-start mb-2">
              <DialogTitle className="text-2xl font-black text-brand-dark uppercase tracking-tight">
                {item.name}
              </DialogTitle>
              <div className="flex items-center gap-1 text-amber-500 font-bold bg-amber-50 px-2 py-1 rounded-lg">
                <Star size={16} fill="currentColor" />
                <span>{item.rating.toFixed(1)}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-gray-500 font-medium text-sm mb-4">
               <Users size={16} />
               <span>{item.capacity}</span>
            </div>

            <DialogDescription className="text-gray-600 text-sm leading-relaxed mb-6">
              {item.description}
            </DialogDescription>

            <div className="space-y-4">
               <h4 className="text-sm font-black text-brand uppercase tracking-wider">Facilities & Benefits</h4>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {benefits.map((benefit, i) => (
                     <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check size={16} className="text-brand mt-0.5 flex-shrink-0" />
                        <span>{benefit}</span>
                     </div>
                  ))}
               </div>
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-gray-100">
             <div className="flex justify-between items-end mb-4">
                <div className="flex flex-col">
                   <span className="text-xs text-gray-500 font-bold uppercase">Price per night</span>
                   <div className="flex items-center gap-2">
                       {item.originalPrice && item.originalPrice > item.price && (
                           <span className="text-sm text-gray-400 line-through font-semibold">
                               {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.originalPrice)}
                           </span>
                       )}
                       <span className="text-2xl font-black text-brand-dark">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.price)}
                       </span>
                   </div>
                </div>
             </div>
             
             <Button 
                className="w-full h-12 text-base font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-brand/20"
                onClick={() => {
                   onBook(item);
                   onOpenChange(false);
                }}
                disabled={(item.availability ?? 0) <= 0}
             >
                {(item.availability ?? 0) > 0 ? 'Book Now' : 'Full Booked'}
             </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
