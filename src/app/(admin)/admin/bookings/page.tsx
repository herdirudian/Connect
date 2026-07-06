'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCw, CheckCircle, XCircle, Search, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ExportButton from '@/components/admin/ExportButton';

interface Booking {
  id: string;
  userId: string;
  user: {
    name: string;
    email: string;
    phoneNumber: string | null;
  };
  type: string;
  date: string;
  status: string;
  amount: number;
  paymentStatus: string;
  createdAt: string;
  items?: string;
  discount?: number;
  promoCode?: string;
  domisili?: string;
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    setPage(1);
  }, [filterStatus]);

  useEffect(() => {
    fetchBookings(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, page]);

  // Auto refresh every 10s and also when tab becomes visible
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Only refresh silently if there might be updates
      // We refresh for ALL and PENDING filters
      if (filterStatus === 'ALL' || filterStatus === 'PENDING') {
        fetchBookings(false);
      }
    }, 10000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchBookings(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [filterStatus, page]);

  async function fetchBookings(showLoading: boolean = false) {
    if (showLoading) setLoading(true);
    try {
      const url = new URL('/api/admin/bookings', window.location.origin);
      if (filterStatus !== 'ALL') url.searchParams.append('paymentStatus', filterStatus);
      url.searchParams.set('page', String(page));
      url.searchParams.set('pageSize', String(pageSize));
      
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setBookings(Array.isArray(data?.items) ? data.items : []);
        setTotal(Number(data?.total || 0) || 0);
        setTotalPages(Math.max(1, Number(data?.totalPages || 1) || 1));
      } else {
        toast({ title: 'Error', description: 'Failed to fetch bookings', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  const showingText = useMemo(() => {
    if (total <= 0) return 'Menampilkan 0 data';
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `Menampilkan ${start}–${end} dari ${total} transaksi`;
  }, [page, pageSize, total]);

  async function handleCheckStatus(id: string) {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/bookings/${id}/check-status`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'PAID') {
        toast({ title: 'Success', description: 'Booking verified as PAID' });
        fetchBookings();
      } else {
        toast({ title: 'Info', description: `Status from Payment Gateway: ${data.status}` });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to check status', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  }

  async function handleUpdateStatus(id: string, paymentStatus: string, status: string) {
    if (!confirm(`Are you sure you want to mark this booking as ${paymentStatus}?`)) return;
    
    setProcessingId(id);
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, paymentStatus, status })
      });
      
      if (res.ok) {
        toast({ title: 'Success', description: 'Booking updated successfully' });
        fetchBookings();
      } else {
        toast({ title: 'Error', description: 'Failed to update booking', variant: 'destructive' });
      }
    } catch (error) {
        toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-700 border-green-200';
      case 'PENDING': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'EXPIRED': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Booking Management</h2>
          <p className="text-gray-500">View and manage all user bookings.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
           <select 
             className="h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand w-full sm:w-auto"
             value={filterStatus}
             onChange={(e) => setFilterStatus(e.target.value)}
           >
             <option value="ALL">All Status</option>
             <option value="PENDING">Pending</option>
             <option value="PAID">Paid</option>
             <option value="EXPIRED">Expired</option>
             <option value="CANCELLED">Cancelled</option>
           </select>
           <div className="flex gap-2">
             <ExportButton endpoint="/api/admin/bookings/export" filename="bookings-report.csv" />
             <Button onClick={() => fetchBookings()} variant="outline" size="icon">
               <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
             </Button>
           </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-xs uppercase font-medium text-gray-500">
                        <tr>
                            <th scope="col" className="px-4 md:px-6 py-3 tracking-wider text-left">ID / Date</th>
                            <th scope="col" className="px-4 md:px-6 py-3 tracking-wider text-left">User</th>
                            <th scope="col" className="px-4 md:px-6 py-3 tracking-wider text-left">Domisili</th>
                            <th scope="col" className="px-4 md:px-6 py-3 tracking-wider text-left">Type</th>
                            <th scope="col" className="px-4 md:px-6 py-3 tracking-wider text-left">Item (Qty)</th>
                            <th scope="col" className="px-4 md:px-6 py-3 tracking-wider text-left">Amount</th>
                            <th scope="col" className="px-4 md:px-6 py-3 tracking-wider text-left">Status</th>
                            <th scope="col" className="px-4 md:px-6 py-3 tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center justify-center space-y-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-brand" />
                                        <p className="text-gray-500 font-medium">Loading bookings...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : bookings.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                    No bookings found.
                                </td>
                            </tr>
                        ) : (
                            bookings.map((booking) => (
                                <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-4 md:px-6 py-4">
                                        <div className="font-mono font-bold text-brand-dark">{booking.id.substring(0, 8)}...</div>
                                        <div className="text-gray-500 text-xs">
                                            {new Date(booking.date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                                        </div>
                                    </td>
                                    <td className="px-4 md:px-6 py-4">
                                        <div className="font-medium text-gray-900">{booking.user.name}</div>
                                        <div className="text-gray-500 text-xs">{booking.user.email}</div>
                                        {booking.user.phoneNumber && (
                                            <div className="text-gray-400 text-xs">{booking.user.phoneNumber}</div>
                                        )}
                                    </td>
                                    <td className="px-4 md:px-6 py-4">
                                        <div className="text-sm text-gray-700 font-medium capitalize">
                                            {booking.domisili || '-'}
                                        </div>
                                    </td>
                                    <td className="px-4 md:px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 whitespace-nowrap">
                                            {booking.type}
                                        </span>
                                    </td>
                                    <td className="px-4 md:px-6 py-4 max-w-[200px]">
                                        <div className="text-sm truncate" title={booking.items}>{booking.items || '-'}</div>
                                        {booking.discount ? (
                                            <div className="text-xs text-green-600 mt-1">
                                                Diskon: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(booking.discount)}
                                                {booking.promoCode && <span className="font-mono ml-1">({booking.promoCode})</span>}
                                            </div>
                                        ) : null}
                                    </td>
                                    <td className="px-4 md:px-6 py-4 font-medium whitespace-nowrap">
                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(booking.amount)}
                                    </td>
                                    <td className="px-4 md:px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border whitespace-nowrap ${getStatusColor(booking.paymentStatus)}`}>
                                            {booking.paymentStatus}
                                        </span>
                                        {booking.paymentStatus === 'PAID' && booking.status !== 'CONFIRMED' && (
                                            <div className="text-xs text-red-500 mt-1 whitespace-nowrap">Stuck ({booking.status})</div>
                                        )}
                                    </td>
                                    <td className="px-4 md:px-6 py-4 text-right space-x-2 whitespace-nowrap">
                                        {booking.paymentStatus === 'PENDING' && (
                                            <>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    onClick={() => handleCheckStatus(booking.id)}
                                                    disabled={processingId === booking.id}
                                                    title="Check Payment Status"
                                                >
                                                    {processingId === booking.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    className="bg-green-600 hover:bg-green-700 text-white"
                                                    onClick={() => handleUpdateStatus(booking.id, 'PAID', 'CONFIRMED')}
                                                    disabled={processingId === booking.id}
                                                    title="Mark as Paid (Manual)"
                                                >
                                                    <CheckCircle className="h-3 w-3" />
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="destructive"
                                                    onClick={() => handleUpdateStatus(booking.id, 'CANCELLED', 'CANCELLED')}
                                                    disabled={processingId === booking.id}
                                                    title="Cancel Booking"
                                                >
                                                    <XCircle className="h-3 w-3" />
                                                </Button>
                                            </>
                                        )}
                                        {booking.paymentStatus === 'PAID' && (
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                disabled
                                            >
                                                Verified
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 md:px-6 py-4 border-t border-gray-100">
              <div className="text-sm text-gray-600 font-medium">{showingText}</div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={loading || page <= 1}
                >
                  Prev
                </Button>
                <div className="text-sm font-semibold text-gray-700">
                  Page {page} / {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={loading || page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
