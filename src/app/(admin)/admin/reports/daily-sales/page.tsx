'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Row = { date: string; bookings: number; food: number; housekeeping: number; total: number };
type ItemRow = { date: string; source: string; item: string; unitPrice: number; quantity: number; total: number };

export default function DailySalesReportPage() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [rows, setRows] = useState<Row[]>([]);
  const [itemRows, setItemRows] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'summary' | 'items'>('summary');

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh(viewOverride?: 'summary' | 'items', startOverride?: string, endOverride?: string) {
    setLoading(true);
    try {
      const effectiveView = viewOverride || view;
      const effectiveStart = typeof startOverride === 'string' ? startOverride : startDate;
      const effectiveEnd = typeof endOverride === 'string' ? endOverride : endDate;
      const params = new URLSearchParams();
      if (effectiveStart) params.set('startDate', effectiveStart);
      if (effectiveEnd) params.set('endDate', effectiveEnd);
      params.set('view', effectiveView);
      const res = await fetch(`/api/admin/reports/daily-sales?${params.toString()}`);
      const data = await res.json();
      if (effectiveView === 'items') {
        setItemRows(data.rows || []);
      } else {
        setRows(data.rows || []);
      }
    } finally {
      setLoading(false);
    }
  }

  function formatIDR(n: number) {
    try { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0); } catch { return `Rp ${n}`; }
  }

  function exportCsv() {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    params.set('view', view);
    window.open(`/api/admin/reports/daily-sales/export?${params.toString()}`, '_blank');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Daily Sales Report</h2>
          <p className="text-muted-foreground">Rekap pendapatan harian (Bookings, Food, Housekeeping) dengan filter tanggal.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Tanggal</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Mode</span>
            <Button
              variant={view === 'summary' ? 'primary' : 'outline'}
              onClick={() => {
                setView('summary');
                refresh('summary');
              }}
              disabled={loading}
            >
              Ringkasan
            </Button>
            <Button
              variant={view === 'items' ? 'primary' : 'outline'}
              onClick={() => {
                setView('items');
                refresh('items');
              }}
              disabled={loading}
            >
              Detail Item
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Mulai</span>
            <input type="date" className="border rounded px-2 py-1 text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Selesai</span>
            <input type="date" className="border rounded px-2 py-1 text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => refresh()} disabled={loading}>{loading ? 'Loading...' : 'Terapkan'}</Button>
            <Button
              variant="outline"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                refresh(undefined, '', '');
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hasil</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {view === 'items' ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Tanggal</th>
                  <th className="py-2 pr-4">Sumber</th>
                  <th className="py-2 pr-4">Item</th>
                  <th className="py-2 pr-4">Harga</th>
                  <th className="py-2 pr-4">Total Item</th>
                  <th className="py-2 pr-4">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {itemRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-gray-500 text-center">Belum ada data.</td>
                  </tr>
                ) : itemRows.map((r, idx) => (
                  <tr key={`${r.date}-${r.source}-${r.item}-${r.unitPrice}-${idx}`}>
                    <td className="py-2 pr-4">{r.date}</td>
                    <td className="py-2 pr-4">{r.source}</td>
                    <td className="py-2 pr-4">{r.item}</td>
                    <td className="py-2 pr-4">{formatIDR(r.unitPrice)}</td>
                    <td className="py-2 pr-4">{r.quantity}</td>
                    <td className="py-2 pr-4 font-bold">{formatIDR(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Tanggal</th>
                  <th className="py-2 pr-4">Bookings</th>
                  <th className="py-2 pr-4">Food</th>
                  <th className="py-2 pr-4">Housekeeping</th>
                  <th className="py-2 pr-4">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-gray-500 text-center">Belum ada data.</td>
                  </tr>
                ) : rows.map(r => (
                  <tr key={r.date}>
                    <td className="py-2 pr-4">{r.date}</td>
                    <td className="py-2 pr-4">{formatIDR(r.bookings)}</td>
                    <td className="py-2 pr-4">{formatIDR(r.food)}</td>
                    <td className="py-2 pr-4">{formatIDR(r.housekeeping)}</td>
                    <td className="py-2 pr-4 font-bold">{formatIDR(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
