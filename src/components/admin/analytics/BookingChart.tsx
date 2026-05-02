
'use client';

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface BookingChartProps {
  bookingsData: Array<{ date: string; count: number }>;
  foodOrdersData: Array<{ date: string; count: number }>;
}

export function BookingChart({ bookingsData, foodOrdersData }: BookingChartProps) {
  const chartData = {
    labels: bookingsData.map((d) => new Date(d.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })),
    datasets: [
      {
        label: 'Bookings (Tiket/Glamping)',
        data: bookingsData.map((d) => d.count),
        backgroundColor: '#3b82f6',
      },
      {
        label: 'Pesanan Makanan',
        data: foodOrdersData.map((d) => d.count),
        backgroundColor: '#f97316',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
        x: {
            stacked: true,
        },
        y: {
            stacked: true,
            ticks: {
                stepSize: 1
            }
        }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grafik Transaksi</CardTitle>
      </CardHeader>
      <CardContent className="h-[350px]">
        <Bar options={options} data={chartData} />
      </CardContent>
    </Card>
  );
}
