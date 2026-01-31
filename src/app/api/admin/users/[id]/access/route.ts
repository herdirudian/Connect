import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const decoded = verifyToken(token) as any;

    if (!decoded || decoded.role !== 'ADMIN') {
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
