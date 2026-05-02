'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Brush } from 'lucide-react';

export default function AdminHousekeepingOrdersPaidPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const prevPaidIdsRef = useRef<Set<string>>(new Set());
  const lastPollRef = useRef<number>(Date.now());
  const [showHistory, setShowHistory] = useState(false);
  const [deliveredOrders, setDeliveredOrders] = useState<any[]>([]);
  const [historyDate, setHistoryDate] = useState<string>('');
  const [lastPaidCount, setLastPaidCount] = useState(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    fetchPaid(true);
  }, []);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => fetchPaid(true), 7000);
    return () => clearInterval(id);
  }, [live]);

  async function playTone() {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx || !soundEnabled) return;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      if (audioBufferRef.current) {
        const src = ctx.createBufferSource();
        const gain = ctx.createGain();
        gain.gain.value = 0.8;
        src.buffer = audioBufferRef.current;
        src.connect(gain); gain.connect(ctx.destination);
        src.start(0);
      } else {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = 880;
        g.gain.value = 0.2;
        o.connect(g); g.connect(ctx.destination);
        o.start();
        setTimeout(() => { o.stop(); }, 600);
      }
    } catch {}
  }

  async function enableSound() {
    try {
      if (!audioCtxRef.current) {
        const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new Ctor();
      }
      await audioCtxRef.current!.resume();
      try {
        const resp = await fetch('/music/mixkit-happy-bells-notification-937.wav');
        const arr = await resp.arrayBuffer();
        const buf = await audioCtxRef.current!.decodeAudioData(arr);
        audioBufferRef.current = buf;
      } catch {}
      setSoundEnabled(true);
      playTone();
    } catch {}
  }

  async function fetchPaid(silent?: boolean) {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/admin/housekeeping/orders');
      const data = await res.json();
      if (Array.isArray(data)) {
        setOrders(data);
        const paidIds = new Set<string>(
          data
            .filter((o: any) => (o.paymentStatus === 'PAID' || o.status === 'CONFIRMED'))
            .map((o: any) => o.id)
        );
        const prev = prevPaidIdsRef.current;
        const newPaid = Array.from(paidIds).filter((id) => !prev.has(id));
        const nowTs = Date.now();
        if (!initializedRef.current) {
          initializedRef.current = true;
          prevPaidIdsRef.current = paidIds;
          setLastPaidCount(paidIds.size);
        } else {
          if (soundEnabled && (newPaid.length > 0 || paidIds.size > lastPaidCount)) {
            playTone();
          }
          setLastPaidCount(paidIds.size);
          prevPaidIdsRef.current = paidIds;
        }
        lastPollRef.current = nowTs;
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function fetchDelivered() {
    try {
      const res = await fetch('/api/admin/housekeeping/orders');
      const data = await res.json();
      if (Array.isArray(data)) {
        setDeliveredOrders(data.filter((o: any) => o.status === 'COMPLETED'));
      }
    } catch {}
  }
  function ymdJakarta(dt: string | Date) {
    const local = new Date(new Date(dt).toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const y = local.getFullYear();
    const m = String(local.getMonth() + 1).padStart(2, '0');
    const d = String(local.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  async function updateStatus(id: string, status: 'PREPARING' | 'DELIVERING' | 'COMPLETED') {
    try {
      const res = await fetch('/api/admin/housekeeping/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) {
        fetchPaid(true);
        if (showHistory) fetchDelivered();
      }
    } catch {}
  }

  const paidOrders = useMemo(() => orders.filter(o => (o.paymentStatus === 'PAID' || o.status === 'CONFIRMED') && o.status !== 'COMPLETED'), [orders]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Paid Housekeeping Orders</h2>
          <p className="text-muted-foreground">Orders that have been paid (auto-refresh).</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-bold border border-green-200">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Live
        </span>
        <Button variant="outline" size="sm" onClick={() => setLive((v) => !v)}>{live ? 'Pause' : 'Resume'}</Button>
        <Button variant="outline" size="sm" onClick={() => fetchPaid(false)}>Refresh</Button>
        <Button variant={soundEnabled ? 'primary' : 'outline'} size="sm" onClick={enableSound}>
          {soundEnabled ? 'Sound Enabled' : 'Enable Sound'}
        </Button>
        {soundEnabled && (
          <Button variant="outline" size="sm" onClick={playTone}>Test Sound</Button>
        )}
        <Button variant="outline" size="sm" onClick={() => { const next = !showHistory; setShowHistory(next); if (next) fetchDelivered(); }}>
          {showHistory ? 'Hide History' : 'History Diantar'}
        </Button>
      </div>

      {showHistory && (
        <div className="border rounded-xl p-4 bg-white">
          <div className="font-bold mb-2 text-gray-800">Pesanan Diantar</div>
          <div className="flex items-center gap-2 mb-3">
            <input
              type="date"
              className="border rounded px-2 py-1 text-sm"
              value={historyDate}
              onChange={(e) => setHistoryDate(e.target.value)}
            />
            <Button size="sm" variant="outline" onClick={() => fetchDelivered()}>Refresh</Button>
            {!historyDate && (
              <Button size="sm" variant="outline" onClick={() => setHistoryDate(ymdJakarta(new Date()))}>Tanggal Hari Ini</Button>
            )}
          </div>
          {(() => {
            const list = historyDate
              ? deliveredOrders.filter((o: any) => ymdJakarta(o.updatedAt || o.createdAt) === historyDate)
              : deliveredOrders;
            if (list.length === 0) {
              return <div className="text-sm text-gray-500">Belum ada pesanan diantar.</div>;
            }
            return (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {list.slice(0, 40).map((order: any) => (
                  <Card key={'hist-' + order.id}>
                    <CardContent className="p-3">
                      <div className="text-sm font-bold">#{order.id.slice(0,8)}</div>
                      <div className="text-xs text-gray-600">Kamar: {order.roomNumber || '-'}</div>
                      <div className="text-xs text-gray-500">{new Date(order.updatedAt || order.createdAt).toLocaleString()}</div>
                      <div className="mt-2 text-xs">
                        {(order.items || []).map((it: any) => (
                          <div key={it.id} className="flex justify-between">
                            <span>{it.quantity}x {it.item?.name || 'Item'}</span>
                            <span>Rp {(it.price || 0) * (it.quantity || 1).toLocaleString ? ((it.price || 0) * (it.quantity || 1)).toLocaleString() : (it.price || 0) * (it.quantity || 1)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-right text-sm font-bold">Rp {order.totalAmount?.toLocaleString?.() ?? order.totalAmount}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin h-8 w-8 text-brand" />
        </div>
      ) : paidOrders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No paid orders.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paidOrders.map(order => (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Brush size={16} />
                  <span className="font-bold">Order #{order.id.slice(0,8)}</span>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>Kamar: {order.roomNumber || '-'}</div>
                  <div>Tamu: {order.guestName || '-'}</div>
                  <div>{new Date(order.createdAt).toLocaleString()}</div>
                </div>
                <div className="mt-3">
                  <ul className="text-sm space-y-2">
                    {order.items.map((it: any) => (
                      <li key={it.id} className="flex flex-col">
                        <div className="flex justify-between">
                          <span>{it.quantity}x {it.item?.name || 'Item'}</span>
                          <span className="text-gray-500">Rp {(it.price * it.quantity).toLocaleString()}</span>
                        </div>
                        {it.requestNote && (
                          <div className="text-xs text-gray-500 italic ml-4 mt-0.5">
                            Catatan: {it.requestNote}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="font-bold mt-2 text-right">Rp {order.totalAmount.toLocaleString()}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button size="sm" onClick={() => updateStatus(order.id, 'PREPARING')}>Proses</Button>
                  <Button
                    size="sm"
                    variant={order.status === 'DELIVERING' ? 'primary' : 'outline'}
                    onClick={() => updateStatus(order.id, 'DELIVERING')}
                  >
                    Sedang Diantar
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => updateStatus(order.id, 'COMPLETED')}>Sudah Diantar</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
