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

    return NextResponse.json({ registrations, count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
