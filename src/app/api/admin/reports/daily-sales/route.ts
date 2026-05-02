import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { getAuthUser } from '@/lib/serverAuth';

function canView(role: string, perms: string[]) {
  if (role === 'ADMIN') return true;
  return perms.includes(PERMISSIONS.VIEW_REPORTS);
}

function parseDate(d?: string | null) {
  if (!d) return null;
  const t = d.trim();
  if (!t) return null;
  // Expect YYYY-MM-DD
  const parts = t.split('-').map(Number);
  if (parts.length === 3) {
    const [y, m, day] = parts;
    const dt = new Date(Date.UTC(y, (m || 1) - 1, day || 1));
    return isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(t);
  return isNaN(dt.getTime()) ? null : dt;
}

function ymd(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthUser();
    if (!auth || !canView(auth.role, auth.permissions)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const view = (searchParams.get('view') || 'summary').toLowerCase();
    const start = parseDate(searchParams.get('startDate'));
    const endRaw = parseDate(searchParams.get('endDate'));
    const end = endRaw ? new Date(endRaw.getTime()) : null;
    if (end) {
      end.setUTCHours(23, 59, 59, 999);
    }

    const whereRange = (field: 'createdAt') => {
      const f: any = {};
      if (start) f.gte = start;
      if (end) f.lte = end;
      return Object.keys(f).length ? { [field]: f } : {};
    };

    if (view === 'items') {
      const [bookingRows, foodItems, hkItems] = await Promise.all([
        prisma.booking.findMany({
          where: { paymentStatus: 'PAID', ...(whereRange('createdAt') as any) },
          select: { createdAt: true, details: true, type: true, amount: true },
        }),
        prisma.foodOrderItem.findMany({
          where: { order: { paymentStatus: 'PAID', ...(whereRange('createdAt') as any) } },
          select: {
            quantity: true,
            price: true,
            menuItem: { select: { name: true } },
            order: { select: { createdAt: true } },
          },
        }),
        prisma.housekeepingOrderItem.findMany({
          where: { order: { paymentStatus: 'PAID', ...(whereRange('createdAt') as any) } },
          select: {
            quantity: true,
            price: true,
            item: { select: { name: true } },
            order: { select: { createdAt: true } },
          },
        }),
      ]);

      type ItemAgg = { date: string; source: string; item: string; unitPrice: number; quantity: number; total: number };
      const map: Record<string, ItemAgg> = {};
      const addItem = (dt: Date, source: string, item: string, unitPrice: number, quantity: number) => {
        const d = new Date(dt);
        const dateKey = ymd(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())));
        const price = Number(unitPrice) || 0;
        const qty = Number(quantity) || 0;
        const key = `${dateKey}|${source}|${item}|${price}`;
        if (!map[key]) map[key] = { date: dateKey, source, item, unitPrice: price, quantity: 0, total: 0 };
        map[key].quantity += qty;
        map[key].total += price * qty;
      };

      for (const it of foodItems) {
        addItem(it.order.createdAt, 'FOOD', it.menuItem?.name || 'Item', it.price || 0, it.quantity || 0);
      }
      for (const it of hkItems) {
        addItem(it.order.createdAt, 'HOUSEKEEPING', it.item?.name || 'Item', it.price || 0, it.quantity || 0);
      }
      for (const b of bookingRows) {
        let addedAny = false;
        try {
          const details = typeof b.details === 'string' ? JSON.parse(b.details) : b.details;
          const items = Array.isArray(details?.items) ? details.items : [];
          for (const i of items) {
            const name = String(i?.name || '').trim();
            const qty = Number(i?.qty) || 0;
            const price = Number(i?.price) || 0;
            if (!name || qty <= 0 || price <= 0) continue;
            addItem(b.createdAt, 'BOOKING', name, price, qty);
            addedAny = true;
          }
        } catch {}
        if (!addedAny) {
          addItem(b.createdAt, 'BOOKING', `Booking ${b.type || ''}`.trim(), b.amount || 0, 1);
        }
      }

      const rows = Object.values(map).sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        if (a.source !== b.source) return a.source < b.source ? -1 : 1;
        if (a.item !== b.item) return a.item < b.item ? -1 : 1;
        return a.unitPrice - b.unitPrice;
      });

      return NextResponse.json({ rows });
    }

    const [bookings, foods, hks] = await Promise.all([
      prisma.booking.findMany({
        where: { paymentStatus: 'PAID', ...(whereRange('createdAt') as any) },
        select: { createdAt: true, amount: true },
      }),
      prisma.foodOrder.findMany({
        where: { paymentStatus: 'PAID', ...(whereRange('createdAt') as any) },
        select: { createdAt: true, totalAmount: true },
      }),
      prisma.housekeepingOrder.findMany({
        where: { paymentStatus: 'PAID', ...(whereRange('createdAt') as any) },
        select: { createdAt: true, totalAmount: true },
      }),
    ]);

    const map: Record<string, { date: string; bookings: number; food: number; housekeeping: number; total: number }> = {};
    const add = (dt: Date, amount: number, key: 'bookings' | 'food' | 'housekeeping') => {
      const d = new Date(dt);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth();
      const day = d.getUTCDate();
      const dateKey = ymd(new Date(Date.UTC(y, m, day)));
      if (!map[dateKey]) map[dateKey] = { date: dateKey, bookings: 0, food: 0, housekeeping: 0, total: 0 };
      map[dateKey][key] += amount;
      map[dateKey].total += amount;
    };

    for (const b of bookings) add(b.createdAt, b.amount || 0, 'bookings');
    for (const f of foods) add(f.createdAt, f.totalAmount || 0, 'food');
    for (const h of hks) add(h.createdAt, h.totalAmount || 0, 'housekeeping');

    const rows = Object.values(map).sort((a, b) => (a.date < b.date ? -1 : 1));
    return NextResponse.json({ rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to build report' }, { status: 500 });
  }
}
