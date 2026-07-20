import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/serverAuth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export async function GET(req: Request) {
  const auth = await getAuthUser();
  if (!auth || !hasPermission(auth.permissions, PERMISSIONS.MANAGE_PROMOS)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const sponsor = searchParams.get('sponsor') || 'NONE';

    const registrations = await prisma.childrensDayRegistration.findMany({
      where: { sponsor },
      orderBy: { createdAt: 'desc' }
    });

    const count = await prisma.childrensDayRegistration.count({
      where: { sponsor }
    });

    const settingKey = sponsor === 'BIODEF' ? 'promo_childrens_day_biodef_quota' : 'promo_childrens_day_quota';
    const defaultQuota = sponsor === 'BIODEF' ? 100 : 3000;

    const quotaSetting = await prisma.systemSetting.findUnique({
      where: { key: settingKey }
    });
    const maxQuota = quotaSetting ? parseInt(quotaSetting.value, 10) : defaultQuota;

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
    const { maxQuota, sponsor = 'NONE' } = await req.json();
    
    if (typeof maxQuota !== 'number' || maxQuota < 0) {
      return NextResponse.json({ error: 'Invalid quota value' }, { status: 400 });
    }

    const settingKey = sponsor === 'BIODEF' ? 'promo_childrens_day_biodef_quota' : 'promo_childrens_day_quota';

    await prisma.systemSetting.upsert({
      where: { key: settingKey },
      update: { value: maxQuota.toString() },
      create: {
        key: settingKey,
        value: maxQuota.toString(),
        description: `Maksimal kuota untuk promo Hari Anak Nasional ${sponsor}`
      }
    });

    return NextResponse.json({ success: true, maxQuota });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
