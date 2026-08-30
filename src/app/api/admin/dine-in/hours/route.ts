import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

async function isAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value || '';
  const decoded = verifyToken(token) as any;
  return !!decoded && decoded.role === 'ADMIN';
}

function sanitizeHHMM(v?: string) {
  const m = (v || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export async function GET(req: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');

    if (restaurantId) {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { openingTime: true, closingTime: true }
      });
      return NextResponse.json({ 
        open: restaurant?.openingTime || '07:00', 
        close: restaurant?.closingTime || '22:00' 
      });
    }

    // Legacy/Global fallback
    const rows: any[] = await prisma.$queryRaw`SELECT \`key\`, value FROM SystemSetting WHERE \`key\` IN ('DINE_IN_OPEN', 'DINE_IN_CLOSE')`;
    const map = new Map(rows.map(r => [r.key, r.value]));
    const open = sanitizeHHMM(map.get('DINE_IN_OPEN') || undefined) || '07:00';
    const close = sanitizeHHMM(map.get('DINE_IN_CLOSE') || undefined) || '22:00';
    return NextResponse.json({ open, close });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch hours' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { open, close, restaurantId } = await req.json() as { open: string; close: string; restaurantId?: string };
    const o = sanitizeHHMM(open);
    const c = sanitizeHHMM(close);
    if (!o || !c) return NextResponse.json({ error: 'Format jam harus HH:mm' }, { status: 400 });

    if (restaurantId) {
      await prisma.restaurant.update({
        where: { id: restaurantId },
        data: { openingTime: o, closingTime: c }
      });
      return NextResponse.json({ success: true, open: o, close: c });
    }

    // Global save (Legacy)
    await prisma.$executeRaw`
      INSERT INTO SystemSetting (\`key\`, value, description, updatedAt, createdAt)
      VALUES ('DINE_IN_OPEN', ${o}, 'Jam buka Dine In', NOW(), NOW())
      ON DUPLICATE KEY UPDATE value = ${o}, updatedAt = NOW()
    `;
    await prisma.$executeRaw`
      INSERT INTO SystemSetting (\`key\`, value, description, updatedAt, createdAt)
      VALUES ('DINE_IN_CLOSE', ${c}, 'Jam tutup Dine In', NOW(), NOW())
      ON DUPLICATE KEY UPDATE value = ${c}, updatedAt = NOW()
    `;
    return NextResponse.json({ success: true, open: o, close: c });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to save hours' }, { status: 500 });
  }
}