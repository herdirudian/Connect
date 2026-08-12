'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Utensils, Copy } from 'lucide-react';

export const dynamic = 'force-dynamic';

function formatIDR(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
}

export default function TrackDineInOrderPage() {
  const [phone, setPhone] = useState('');
  const [last4, setLast4] = useState('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      const p = params.get('phone');
      const l4 = params.get('last4');
      if (p) setPhone(p);
      if (l4) setLast4(l4);
    } catch {}
  }, []);

  useEffect(() => {
    if (phone && last4.length === 4) {
      fetchOrder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, last4]);

  async function fetchOrder() {
    if (!phone || phone.trim().length < 6) {
      setError('Masukkan nomor telepon lengkap');
      return;
    }
    if (last4.trim().length !== 4) {
      setError('Masukkan 4 digit terakhir nomor telepon');
      return;
    }
    setLoading(true);
    setError('');
    setOrders(null);
    try {
      const qs = `?phone=${encodeURIComponent(phone)}&last4=${encodeURIComponent(last4)}`;
      const res = await fetch(`/api/dine-in/orders/by-phone${qs}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal menemukan order');
      } else {
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      setError('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }

  function computeSubtotal(order: any) {
    return (order?.items || []).reduce((s: number, it: any) => s + (it.price || 0) * (it.quantity || 1), 0);
  }

  function statusBadge(status: string) {
    const label =
      status === 'PREPARING' ? 'Sedang diproses' :
      status === 'DELIVERING' ? 'Sedang diantar' :
      status === 'COMPLETED' ? 'Sudah diantar' :
      status === 'CONFIRMED' ? 'Sudah dibayar' :
      status === 'PENDING' ? 'Menunggu pembayaran' :
      status === 'CANCELLED' ? 'Dibatalkan' : status || '-';
    const cls =
      status === 'PREPARING' ? 'bg-yellow-100 text-yellow-700' :
      status === 'DELIVERING' ? 'bg-indigo-100 text-indigo-700' :
      status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
      status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' :
      status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
      status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700';
    return { label, cls };
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-black text-brand-dark uppercase tracking-tight">Track Dine-In Order</h1>
        <p className="text-gray-500">Masukkan nomor telepon untuk melihat status pesanan meja Anda.</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <input
              className="border rounded px-3 py-2 w-full"
              placeholder="Nomor Telepon (lengkap)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <input
              className="border rounded px-3 py-2 w-full"
              placeholder="4 digit terakhir"
              value={last4}
              onChange={(e) => setLast4(e.target.value)}
            />
            <Button onClick={fetchOrder} disabled={loading} className="w-full">
              {loading ? 'Memuat...' : 'Lihat Status'}
            </Button>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </CardContent>
      </Card>

      {orders && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <Card><CardContent className="p-4 text-gray-600">Tidak ada pesanan untuk nomor ini.</CardContent></Card>
          ) : (
            orders.map(order => {
              const subtotal = computeSubtotal(order);
              const adminFee = Math.max(0, (order.totalAmount || 0) - subtotal);
              return (
                <Card key={order.id} className="border-2 rounded-2xl border-green-200 hover:shadow-md transition">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Utensils className="h-4 w-4 text-green-600" />
                      <span>Order #{(order.id || '').slice(0,8)} • {order.restaurant}</span>
                      <button
                        title="Copy Order ID"
                        className="ml-auto inline-flex items-center gap-1 text-xs px-2 py-1 border rounded hover:bg-gray-50"
                        onClick={() => navigator.clipboard.writeText(order.id || '')}
                      >
                        <Copy className="h-3 w-3" /> Copy ID
                      </button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <span>Status:</span>
                        {(() => {
                          const b = statusBadge(order.status);
                          return <span className={`px-2 py-1 rounded text-xs font-bold ${b.cls}`}>{b.label}</span>;
                        })()}
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Payment:</span>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : order.paymentStatus === 'PENDING' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                          {order.paymentStatus}
                        </span>
                      </div>
                      <div>Meja: {order.tableNumber || '-'}</div>
                      <div>Pemesan: {order.guestName || '-'}</div>
                    </div>
                    <div className="border rounded p-3">
                      <ul className="space-y-1 text-sm">
                        {order.items.map((it: any) => (
                          <li key={it.id} className="flex justify-between">
                            <span>{it.quantity}x {it.name}</span>
                            <span className="text-gray-600">{formatIDR((it.price || 0) * (it.quantity || 1))}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2 text-xs text-gray-600">
                        <div className="flex justify-between"><span>Subtotal</span><span>{formatIDR(subtotal)}</span></div>
                        <div className="flex justify-between"><span>Admin Fee</span><span>{formatIDR(adminFee)}</span></div>
                      </div>
                      <div className="mt-1 text-right font-bold">{formatIDR(order.totalAmount)}</div>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-end">
                      {order.paymentStatus === 'PENDING' && order.paymentUrl && (
                        <Button variant="outline" onClick={() => { window.location.href = order.paymentUrl; }}>
                          Bayar Sekarang
                        </Button>
                      )}
                      <Button variant="outline" onClick={() => window.open(`/api/food/orders/${order.id}/invoice`, '_blank')}>
                        Download Invoice
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
