import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token) as any;
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        family: {
          include: {
            members: {
              select: {
                id: true,
                name: true,
                email: true,
                isFamilyHead: true,
                familyRelation: true,
                createdAt: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (!user.familyId) {
       return NextResponse.json({ family: null, isHead: false });
    }

    return NextResponse.json({
       family: user.family,
       isHead: user.isFamilyHead
    });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch family' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token) as any;
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (user.familyId) {
      return NextResponse.json({ error: 'User already in a family' }, { status: 400 });
    }

    // Create new family
    const family = await prisma.family.create({
      data: {
        name: `${user.name}'s Family`,
        members: {
          connect: { id: user.id }
        }
      }
    });

    // Set user as Head and Relation as Self
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isFamilyHead: true,
        familyRelation: 'Self'
      }
    });

    return NextResponse.json({ family, isHead: true });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create family' }, { status: 500 });
  }
}
