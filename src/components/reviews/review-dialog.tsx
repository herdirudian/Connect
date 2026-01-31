'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from './star-rating';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId?: string;
  foodOrderId?: string;
  accommodationId?: string;
  restaurantId?: string;
  onSuccess?: () => void;
  title?: string;
}

export function ReviewDialog({ 
  open, 
  onOpenChange, 
  bookingId, 
  foodOrderId, 
  accommodationId, 
  restaurantId,
  onSuccess,
  title = "Write a Review"
}: ReviewDialogProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: "Rating required", description: "Please select a star rating.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          comment,
          bookingId,
          foodOrderId,
          accommodationId,
          restaurantId
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast({ title: "Review submitted", description: "Thank you for your feedback!" });
        onOpenChange(false);
        onSuccess?.();
        // Reset form
        setRating(0);
        setComment('');
      } else {
        toast({ title: "Error", description: data.error || "Failed to submit review", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            How was your experience? Your feedback helps us improve.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-medium text-gray-500">Rate your experience</span>
            <StarRating rating={rating} onRatingChange={setRating} size={32} />
          </div>
          
          <div className="w-full space-y-2">
            <label className="text-sm font-medium text-gray-700">Comment (Optional)</label>
            <Textarea 
              placeholder="Tell us more about what you liked or disliked..." 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="resize-none"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || rating === 0} className="bg-brand hover:bg-brand-dark">
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
