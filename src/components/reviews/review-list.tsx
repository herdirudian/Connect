'use client';

import { useEffect, useState } from 'react';
import { StarRating } from './star-rating';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: {
    name: string;
    avatarUrl: string | null;
  };
}

interface ReviewListProps {
  accommodationId?: string;
  restaurantId?: string;
}

export function ReviewList({ accommodationId, restaurantId }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReviews() {
      try {
        const params = new URLSearchParams();
        if (accommodationId) params.set('accommodationId', accommodationId);
        if (restaurantId) params.set('restaurantId', restaurantId);
        
        const res = await fetch(`/api/reviews?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setReviews(data);
        }
      } catch (error) {
        console.error("Failed to fetch reviews", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchReviews();
  }, [accommodationId, restaurantId]);

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>;
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
        <p>No reviews yet. Be the first to share your experience!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg text-gray-900">Reviews ({reviews.length})</h3>
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={review.user.avatarUrl || ''} />
                <AvatarFallback>{review.user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{review.user.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <StarRating rating={review.rating} readOnly size={14} />
                      <span className="text-xs text-gray-400">• {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
                {review.comment && (
                  <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                    {review.comment}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
