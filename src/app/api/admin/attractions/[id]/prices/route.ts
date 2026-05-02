import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

async function isAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value || '';
  const decoded = verifyToken(token) as any;
  return !!decoded && decoded.role === 'ADMIN';
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const url = new URL(req.url);
    const dateStr = url.searchParams.get('date');

    const [attraction, schedules] = await Promise.all([
      prisma.attraction.findUnique({ where: { id } }),
      prisma.attractionPriceSchedule.findMany({
        where: { attractionId: id },
        orderBy: [{ validFrom: 'asc' }, { validUntil: 'asc' }]
      })
    ]);

    if (!attraction) return NextResponse.json({ error: 'Attraction not found' }, { status: 404 });

    let effectivePrice: number | null = null;
    if (dateStr) {
      const d = new Date(dateStr);
      const eff = schedules.find(s => new Date(s.validFrom) <= d && new Date(s.validUntil) >= d);
      effectivePrice = eff ? eff.price : attraction.price;
    }

    return NextResponse.json({ basePrice: attraction.price, schedules, effectivePrice });
  } catch (error: any) {
    console.error('GET schedules error:', error);
    const msg = (error?.code === 'P2021')
      ? 'Pricing schedule table not found. Please run: npx prisma db push'
      : (error.message || 'Failed to fetch schedules');
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await req.json();

    // CSV import
    if (body.importCsv && typeof body.csv === 'string') {
      const lines = body.csv.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
      const created: any[] = [];
      for (const line of lines) {
        const parts = line.split(',').map((p: string) => p.trim());
        if (parts.length < 3) continue;
        const [fromStr, untilStr, priceStr] = parts;
        const validFrom = new Date(fromStr);
        const validUntil = new Date(untilStr);
        const price = parseFloat(priceStr);
        if (!isFinite(price)) continue;
        const s = await prisma.attractionPriceSchedule.create({
          data: { attractionId: id, validFrom, validUntil, price }
        });
        created.push(s);
      }
      return NextResponse.json({ success: true, created });
    }

    // Single create
    const { validFrom, validUntil, price } = body;
    if (!validFrom || !validUntil || price === undefined) {
      return NextResponse.json({ error: 'validFrom, validUntil, price are required' }, { status: 400 });
    }
    const schedule = await prisma.attractionPriceSchedule.create({
      data: {
        attractionId: id,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        price: parseFloat(String(price))
      }
    });
    return NextResponse.json(schedule);
  } catch (error: any) {
    console.error('Create schedule error:', error);
    const msg = (error?.code === 'P2021')
      ? 'Pricing schedule table not found. Please run: npx prisma db push'
      : (error.message || 'Failed to create schedule');
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { scheduleId, validFrom, validUntil, price } = body;
    if (!scheduleId) return NextResponse.json({ error: 'scheduleId is required' }, { status: 400 });
    const updated = await prisma.attractionPriceSchedule.update({
      where: { id: scheduleId },
      data: {
        validFrom: validFrom ? new Date(validFrom) : undefined,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        price: price !== undefined ? parseFloat(String(price)) : undefined
      }
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Update schedule error:', error);
    const msg = (error?.code === 'P2021')
      ? 'Pricing schedule table not found. Please run: npx prisma db push'
      : (error.message || 'Failed to update schedule');
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { scheduleId } = body;
    if (!scheduleId) return NextResponse.json({ error: 'scheduleId is required' }, { status: 400 });
    await prisma.attractionPriceSchedule.delete({ where: { id: scheduleId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete schedule error:', error);
    const msg = (error?.code === 'P2021')
      ? 'Pricing schedule table not found. Please run: npx prisma db push'
      : (error.message || 'Failed to delete schedule');
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
