import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function parseHHMM(v?: string) {
  const m = (v || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: ['DINE_IN_OPEN', 'DINE_IN_CLOSE'] } },
      select: { key: true, value: true }
    });
    const map = new Map(settings.map(s => [s.key, s.value]));
    const open = parseHHMM(map.get('DINE_IN_OPEN') || undefined) || '07:00';
    const close = parseHHMM(map.get('DINE_IN_CLOSE') || undefined) || '22:00';
    return NextResponse.json({ open, close });
  } catch {
    return NextResponse.json({ open: '07:00', close: '22:00' });
  }
}