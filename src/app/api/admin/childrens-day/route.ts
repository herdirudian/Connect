import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/serverAuth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export async function GET() {
  const auth = await getAuthUser();
  if (!auth || !hasPermission(auth.permissions, PERMISSIONS.MANAGE_PROMOS)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const registrations = await prisma.childrensDayRegistration.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const count = await prisma.childrensDayRegistration.count();

    const quotaSetting = await prisma.systemSetting.findUnique({
      where: { key: 'promo_childrens_day_quota' }
    });
    const maxQuota = quotaSetting ? parseInt(quotaSetting.value, 10) : 3000;

    return NextResponse.json({ registrations, count, maxQuota });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await getAuthUser();
  if (!auth || !hasPermission(auth.permissions, PERMISSIONS.MANAGE_PROMOS)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { maxQuota } = await req.json();
    
    if (typeof maxQuota !== 'number' || maxQuota < 0) {
      return NextResponse.json({ error: 'Invalid quota value' }, { status: 400 });
    }

    await prisma.systemSetting.upsert({
      where: { key: 'promo_childrens_day_quota' },
      update: { value: maxQuota.toString() },
      create: {
        key: 'promo_childrens_day_quota',
        value: maxQuota.toString(),
        description: 'Maksimal kuota untuk promo Hari Anak Nasional'
      }
    });

    return NextResponse.json({ success: true, maxQuota });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
