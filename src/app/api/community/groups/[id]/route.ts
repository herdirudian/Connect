import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = verifyToken(token) as any;
  if (payload.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const data = await req.json();
    const group = await prisma.communityGroup.update({
      where: { id: params.id },
      data: {
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        color: data.color,
        active: data.active
      }
    });
    return NextResponse.json(group);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = verifyToken(token) as any;
  if (payload.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    await prisma.communityGroup.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}
