'use client';

import { useState, useEffect } from 'react';
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
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();
  }, [filterStatus]);

  async function fetchBookings() {
    setLoading(true);
    try {
      const url = new URL('/api/admin/bookings', window.location.origin);
      if (filterStatus !== 'ALL') url.searchParams.append('paymentStatus', filterStatus);
      
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      } else {
        toast({ title: 'Error', description: 'Failed to fetch bookings', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Booking Management</h2>
          <p className="text-gray-500">View and manage all user bookings.</p>
        </div>
        <div className="flex gap-2">
           <select 
             className="h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand"
             value={filterStatus}
             onChange={(e) => setFilterStatus(e.target.value)}
           >
             <option value="ALL">All Status</option>
             <option value="PENDING">Pending</option>
             <option value="PAID">Paid</option>
             <option value="EXPIRED">Expired</option>
             <option value="CANCELLED">Cancelled</option>
           </select>
           <ExportButton endpoint="/api/admin/bookings/export" filename="bookings-report.csv" />
           <Button onClick={() => fetchBookings()} variant="outline" size="icon">
             <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
           </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">ID / Date</th>
                            <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">User</th>
                            <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">Type</th>
                            <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">Amount</th>
                            <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">Status</th>
                            <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && bookings.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-brand" />
                                </td>
                            </tr>
                        ) : bookings.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    No bookings found.
                                </td>
                            </tr>
                        ) : (
                            bookings.map((booking) => (
                                <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-mono font-bold text-brand-dark">{booking.id.substring(0, 8)}...</div>
                                        <div className="text-gray-500 text-xs">
                                            {new Date(booking.date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{booking.user.name}</div>
                                        <div className="text-gray-500 text-xs">{booking.user.email}</div>
                                        {booking.user.phoneNumber && (
                                            <div className="text-gray-400 text-xs">{booking.user.phoneNumber}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                            {booking.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-medium">
                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(booking.amount)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(booking.paymentStatus)}`}>
                                            {booking.paymentStatus}
                                        </span>
                                        {booking.paymentStatus === 'PAID' && booking.status !== 'CONFIRMED' && (
                                            <div className="text-xs text-red-500 mt-1">Stuck ({booking.status})</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
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
        </CardContent>
      </Card>
    </div>
  );
}
