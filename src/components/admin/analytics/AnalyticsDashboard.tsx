
'use client';

import { useState, useEffect } from 'react';
import { StatCard } from './StatCard';
import { RevenueChart } from './RevenueChart';
import { BookingChart } from './BookingChart';
import { DetailsDialog } from './DetailsDialog';
import { DollarSign, ShoppingCart, Utensils } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsData {
  totalRevenue: number;
  totalBookings: number;
  totalFoodOrders: number;
  revenueOverTime: Array<{ date: string; revenue: number }>;
  bookingsCountOverTime: Array<{ date: string; count: number }>;
  foodOrdersCountOverTime: Array<{ date: string; count: number }>;
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState({ type: '', data: [] });
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/analytics');
        if (!res.ok) {
          throw new Error('Gagal memuat data analitik');
        }
        const analyticsData = await res.json();
        setData(analyticsData);
      } catch (error: any) {
        console.error('Error fetching analytics:', error);
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [toast]);

  async function fetchDetails(type: 'revenue' | 'bookings' | 'food', startDate?: string, endDate?: string) {
    try {
      let url = `/api/admin/analytics/details?type=${type}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const res = await fetch(url);
      if(!res.ok) {
        throw new Error(`Gagal memuat detail ${type}`)
      }
      const detailsData = await res.json();
      setDetails({ type, data: detailsData });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }

  if (loading) {
    return <div className="text-center py-10">Memuat data analitik...</div>;
  }

  if (!data) {
    return <div className="text-center py-10 text-red-500">Gagal memuat data. Silakan coba lagi nanti.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DetailsDialog title="Detail Pendapatan" fetchAction={(s, e) => fetchDetails('revenue', s, e)} data={details.data} type="revenue">
          <div onClick={() => fetchDetails('revenue')} className="cursor-pointer">
            <StatCard
              title="Total Pendapatan"
              value={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(data.totalRevenue)}
              icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            />
          </div>
        </DetailsDialog>

        <DetailsDialog title="Detail Booking" fetchAction={(s, e) => fetchDetails('bookings', s, e)} data={details.data} type="bookings">
          <div onClick={() => fetchDetails('bookings')} className="cursor-pointer">
            <StatCard
              title="Total Booking (Tiket/Glamping)"
              value={data.totalBookings}
              icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
            />
          </div>
        </DetailsDialog>

        <DetailsDialog title="Detail Pesanan Makanan" fetchAction={(s, e) => fetchDetails('food', s, e)} data={details.data} type="food">
          <div onClick={() => fetchDetails('food')} className="cursor-pointer">
            <StatCard
              title="Total Pesanan Makanan"
              value={data.totalFoodOrders}
              icon={<Utensils className="h-4 w-4 text-muted-foreground" />}
            />
          </div>
        </DetailsDialog>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <RevenueChart data={data.revenueOverTime} />
        <BookingChart bookingsData={data.bookingsCountOverTime} foodOrdersData={data.foodOrdersCountOverTime} />
      </div>
    </div>
  );
}
