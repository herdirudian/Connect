'use client';

import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CheckCircle2, XCircle, Home } from 'lucide-react';
import { Suspense } from 'react';

function BookingStatusContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const bookingId = searchParams.get('bookingId');

  const isSuccess = status === 'success';

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
      <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${isSuccess ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
        {isSuccess ? <CheckCircle2 size={48} /> : <XCircle size={48} />}
      </div>
      
      <h1 className="text-3xl font-black text-brand-dark uppercase tracking-tight mb-2">
        {isSuccess ? 'Payment Successful!' : 'Payment Failed'}
      </h1>
      
      <p className="text-gray-500 max-w-md mb-8">
        {isSuccess 
          ? `Thank you for your booking. Your booking ID is ${bookingId}. We have sent the details to your email.` 
          : 'We could not process your payment. Please try again or contact support.'}
      </p>

      <div className="flex gap-4">
        <Link href="/booking">
            <Button variant="outline">
                Back to Booking
            </Button>
        </Link>
        <Link href="https://thelodgegroup.id">
            <Button className="bg-brand-dark hover:bg-brand text-white">
                <Home className="mr-2 h-4 w-4" /> Home
            </Button>
        </Link>
      </div>
    </div>
  );
}

export default function BookingStatusPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100">
                 <Suspense fallback={<div>Loading...</div>}>
                    <BookingStatusContent />
                 </Suspense>
            </div>
        </div>
    );
}
