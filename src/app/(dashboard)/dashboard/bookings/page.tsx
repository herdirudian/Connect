'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, RefreshCw, Star } from 'lucide-react';
import { ReviewDialog } from '@/components/reviews/review-dialog';
import { useToast } from '@/hooks/use-toast';

interface Booking {
  id: string;
  type: string;
  date: string;
  status: string;
  paymentStatus: string;
  amount: number;
  paymentUrl?: string;
  details: string;
  createdAt: string;
  review?: { id: string, rating: number } | null;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [reviewDialog, setReviewDialog] = useState<{ 
    open: boolean; 
    bookingId?: string; 
    accommodationId?: string 
  }>({ open: false });
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    try {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      setBookings(data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function checkStatus(id: string) {
    setCheckingId(id);
    try {
      const res = await fetch(`/api/bookings/${id}/check-status`, { method: 'POST' });
      const data = await res.json();
      
      if (data.status === 'PAID') {
         toast({
            title: "Pembayaran Berhasil",
            description: "Pembayaran Anda telah terkonfirmasi.",
            className: "bg-green-50 border-green-200",
         });
         await fetchBookings();
      } else if (data.status === 'EXPIRED') {
         toast({
            title: "Pembayaran Kadaluarsa",
            description: "Batas waktu pembayaran telah habis.",
            variant: "destructive"
         });
         await fetchBookings();
      } else {
         toast({
            title: "Status Pending",
            description: "Pembayaran belum diterima oleh sistem kami. Jika Anda sudah membayar, mohon tunggu beberapa saat dan cek kembali.",
         });
      }
    } catch (e) {
      console.error("Failed to check status", e);
      toast({
        title: "Gagal Cek Status",
        description: "Terjadi kesalahan saat mengecek status pembayaran.",
        variant: "destructive"
      });
    } finally {
      setCheckingId(null);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'CONFIRMED':
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
      case 'EXPIRED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">My Bookings</h2>
        <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mt-1">Manage your tickets and stays</p>
      </div>

      <div className="space-y-4">
        {bookings.length === 0 ? (
          <Card className="p-8 text-center bg-gray-50 border-dashed">
            <p className="text-gray-500">No bookings found.</p>
          </Card>
        ) : (
          bookings.map((booking) => {
             let details: { items: any[] } = { items: [] };
             try {
                details = JSON.parse(booking.details);
             } catch(e) {}

             return (
              <Card key={booking.id} className="overflow-hidden">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-brand-dark">{booking.type}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(booking.date).toLocaleDateString('id-ID', { dateStyle: 'long' })}
                      </span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor(booking.paymentStatus)}`}>
                      {booking.paymentStatus}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      {details.items && (details.items as any[]).map((item: any, idx: number) => (
                        <p key={idx} className="text-sm font-medium text-gray-900">
                          {item.name} x {item.qty}
                        </p>
                      ))}
                      <p className="text-xs text-gray-500 mt-2">ID: {booking.id}</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-500 font-bold uppercase">Total Amount</p>
                        <p className="text-lg font-black text-brand-dark">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(booking.amount)}
                        </p>
                      </div>
                      
                      {booking.paymentStatus === 'PENDING' && (
                        <div className="flex gap-2">
                           <Button
                              variant="outline"
                              size="sm"
                              onClick={() => checkStatus(booking.id)}
                              disabled={checkingId === booking.id}
                           >
                              {checkingId === booking.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                              <span className="ml-2 hidden sm:inline">Check Status</span>
                           </Button>
                           {booking.paymentUrl && (
                            <Button 
                              className="bg-brand hover:bg-brand-dark text-white font-bold"
                              onClick={() => window.open(booking.paymentUrl, '_blank')}
                            >
                              Pay Now <ExternalLink className="ml-2 h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                      
                      {(booking.paymentStatus === 'PAID' || booking.status === 'CONFIRMED') && (
                        <div className="flex gap-2">
                          {booking.review ? (
                             <div className="flex items-center gap-1 text-yellow-500 font-bold bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-100">
                               <Star className="h-4 w-4 fill-current" />
                               <span>{booking.review.rating}/5</span>
                             </div>
                          ) : (
                             <Button
                               variant="outline"
                               size="sm"
                               className="border-brand text-brand hover:bg-brand-50"
                               onClick={() => {
                                 // Try to find accommodation ID from details
                                 let accId = undefined;
                                 if (details.items && details.items.length > 0) {
                                   accId = details.items[0].id;
                                 }
                                 setReviewDialog({ open: true, bookingId: booking.id, accommodationId: accId });
                               }}
                             >
                               <Star className="h-4 w-4 mr-2" />
                               Write Review
                             </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <ReviewDialog 
        open={reviewDialog.open} 
        onOpenChange={(open) => setReviewDialog(prev => ({ ...prev, open }))}
        bookingId={reviewDialog.bookingId}
        accommodationId={reviewDialog.accommodationId}
        onSuccess={() => {
          setReviewDialog({ open: false });
          fetchBookings();
        }}
      />
    </div>
  );
}
