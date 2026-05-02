'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Star } from 'lucide-react';
import { formatDate, maskName } from '@/lib/utils';
import Image from 'next/image';

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: {
    name: string;
    avatarUrl?: string;
  };
}

interface ReviewsListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetId: string; // Attraction, Accommodation, or Restaurant ID
  targetName: string;
  type: 'attraction' | 'accommodation' | 'restaurant';
}

export function ReviewsListDialog({
  open,
  onOpenChange,
  targetId,
  targetName,
  type
}: ReviewsListDialogProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && targetId) {
      fetchReviews();
    }
  }, [open, targetId]);

  async function fetchReviews() {
    setLoading(true);
    try {
      const paramName = type === 'attraction' ? 'attractionId' : type === 'accommodation' ? 'accommodationId' : 'restaurantId';
      const res = await fetch(`/api/reviews?${paramName}=${targetId}`, { cache: 'no-store' });
      const data = await res.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Reviews for {targetName}</DialogTitle>
          <DialogDescription>
             See what others are saying
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-4 py-4">
          {loading ? (
             <div className="flex justify-center py-8">
               <div className="animate-spin h-8 w-8 border-4 border-brand border-t-transparent rounded-full"></div>
             </div>
          ) : reviews.length === 0 ? (
             <div className="text-center py-8 text-gray-500">
               <p>No reviews yet.</p>
             </div>
          ) : (
             reviews.map((review) => (
               <div key={review.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                 <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-2">
                     <div className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden relative">
                        {review.user.avatarUrl ? (
                          <Image src={review.user.avatarUrl} alt={review.user.name} fill className="object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full w-full bg-brand text-white font-bold text-xs">
                             {review.user.name.charAt(0)}
                          </div>
                        )}
                     </div>
                     <div>
                      <p className="text-sm font-bold text-gray-900">{maskName(review.user.name)}</p>
                      <p className="text-xs text-gray-500">{formatDate(review.createdAt)}</p>
                    </div>
                   </div>
                   <div className="flex items-center gap-0.5 bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-bold">{review.rating}</span>
                   </div>
                 </div>
                 <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
               </div>
             ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
