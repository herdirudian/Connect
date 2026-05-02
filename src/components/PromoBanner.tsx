'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Promo {
  id: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  validUntil?: string | null;
  showButton?: boolean;
}

export function PromoBanner() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const res = await fetch('/api/promos');
        if (res.ok) {
          const data = await res.json();
          setPromos(data);
        }
      } catch (error) {
        console.error('Failed to fetch promos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPromos();
  }, []);

  useEffect(() => {
    if (promos.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % promos.length);
    }, 5000); // Auto slide every 5 seconds

    return () => clearInterval(interval);
  }, [promos.length]);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % promos.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + promos.length) % promos.length);
  };

  if (loading) return null; // Or a skeleton
  if (promos.length === 0) return null; // Don't show if no promos

  const currentPromo = promos[currentIndex];

  return (
    <div className="relative mb-8 group">
      <Card className="overflow-hidden border-none shadow-lg bg-gray-900 text-white relative h-[280px] md:h-[320px]">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          {currentPromo.imageUrl ? (
            <Image
              src={currentPromo.imageUrl}
              alt={currentPromo.title}
              fill
              className="object-cover opacity-60 transition-transform duration-700 hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-brand-dark to-brand opacity-80" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent z-10" />
        </div>

        {/* Content */}
        <div className="relative z-20 h-full flex flex-col justify-center px-6 md:px-12 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand rounded-full w-fit mb-3 md:mb-4">
            <Tag className="w-3 h-3 text-white" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-white">Special Offer</span>
          </div>
          
          <h3 className="text-xl sm:text-2xl md:text-4xl font-black uppercase tracking-tight mb-2 text-white leading-tight">
            {currentPromo.title}
          </h3>
          
          <p className="text-gray-200 text-xs sm:text-sm md:text-base line-clamp-3 md:line-clamp-2 mb-4 md:mb-6 max-w-lg font-medium">
            {currentPromo.description}
          </p>
          
          {(currentPromo.showButton === undefined || currentPromo.showButton) && (
            <Link href={`/dashboard/promos`}>
              <Button className="bg-white text-brand-dark hover:bg-gray-100 font-bold border-none h-9 md:h-10 text-xs md:text-sm">
                View Details
              </Button>
            </Link>
          )}
        </div>

        {/* Navigation Dots */}
        {promos.length > 1 && (
          <div className="absolute bottom-4 right-6 md:right-12 z-30 flex gap-2">
            {promos.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}

        {/* Navigation Arrows (Hidden on mobile, visible on hover desktop) */}
        {promos.length > 1 && (
          <>
            <button 
              onClick={(e) => { e.preventDefault(); prevSlide(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hidden md:block"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={(e) => { e.preventDefault(); nextSlide(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hidden md:block"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </Card>
    </div>
  );
}
