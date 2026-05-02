import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Ticket, Tent } from 'lucide-react';

export default function PublicBookingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8 text-center">
        <div className="space-y-2">
           <h1 className="text-4xl font-black text-brand-dark uppercase tracking-tight">The Lodge Maribaya</h1>
           <p className="text-gray-500 text-lg">Choose your adventure</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 mt-8">
            <Link href="/booking/tickets" className="group">
                <div className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100 group-hover:border-brand/30 h-full flex flex-col items-center justify-center gap-6">
                    <div className="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-colors text-brand">
                        <Ticket size={48} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black text-gray-900 uppercase">Booking Tiket Wisata</h2>
                        <p className="text-gray-500 font-medium">Book tickets for attractions and rides</p>
                    </div>
                    <Button className="w-full bg-brand-dark hover:bg-brand text-white font-bold h-12 rounded-xl mt-4">
                        Book Tickets
                    </Button>
                </div>
            </Link>

            <Link href="/booking/stay" className="group">
                <div className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100 group-hover:border-brand/30 h-full flex flex-col items-center justify-center gap-6">
                    <div className="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-colors text-brand">
                        <Tent size={48} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black text-gray-900 uppercase">Booking Penginapan</h2>
                        <p className="text-gray-500 font-medium">Book your stay at our glamping sites</p>
                    </div>
                    <Button className="w-full bg-brand-dark hover:bg-brand text-white font-bold h-12 rounded-xl mt-4">
                        Book Stay
                    </Button>
                </div>
            </Link>
        </div>
        
        <div className="mt-12 text-sm text-gray-400">
            <Link href="https://thelodgegroup.id" className="hover:text-brand underline">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
