import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/serverAuth';
import { PERMISSIONS } from '@/lib/permissions';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser();
    if (!auth || (auth.role !== 'ADMIN' && !auth.permissions.includes(PERMISSIONS.MANAGE_ROLES))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { role, permissions } = body;

    // Validation
    if (!role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        role,
        permissions: JSON.stringify(permissions || []),
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Update Access Error:', error);
    return NextResponse.json({ error: 'Failed to update access' }, { status: 500 });
  }
}
