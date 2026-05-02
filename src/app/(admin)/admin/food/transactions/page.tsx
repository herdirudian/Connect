'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, List } from 'lucide-react';

export default function AdminFoodTransactionsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/food/orders');
      const data = await res.json();
      if (Array.isArray(data)) setOrders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = orders.filter((o) => {
    if (filter === 'PAID') return o.paymentStatus === 'PAID' || o.status === 'CONFIRMED' || o.status === 'COMPLETED';
    if (filter === 'PENDING') return o.paymentStatus !== 'PAID' && (o.status === 'PENDING' || o.paymentStatus === 'PENDING');
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Food Transactions</h2>
          <p className="text-muted-foreground">Daftar semua pesanan (paid & pending) untuk catatan transaksi.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="h-9 px-3 rounded-md border border-gray-300 bg-white text-sm">
            <option value="ALL">All</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
          </select>
          <Button variant="outline" onClick={fetchAll}>Refresh</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin h-8 w-8 text-brand" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Tidak ada transaksi.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <List size={16} />
                  <div>
                    <div className="font-bold">#{order.id.slice(0,8)} • {order.restaurant?.name}</div>
                    <div className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</div>
                    <div className="text-sm text-gray-700">
                      {(order.items || []).map((it: any) => `${it.quantity}x ${it.menuItem?.name || 'Item'}`).join(', ')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">Rp {order.totalAmount.toLocaleString()}</div>
                  <div className="text-xs mt-1">
                    <span className={`px-2 py-1 rounded-full font-bold ${order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {order.paymentStatus || 'PENDING'}
                    </span>
                    <span className="text-gray-500 ml-2">{order.status}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
