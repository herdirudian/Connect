import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { createNotification } from '@/lib/notifications';

// Add Member
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token) as any;
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  try {
    const body = await req.json();
    const { email, relation } = body;

    if (!email || !relation) {
        return NextResponse.json({ error: 'Email and Relation required' }, { status: 400 });
    }

    const currentUser = await prisma.user.findUnique({ where: { id: payload.userId } });
    
    if (!currentUser || !currentUser.familyId || !currentUser.isFamilyHead) {
       return NextResponse.json({ error: 'Only Family Head can add members' }, { status: 403 });
    }

    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) {
        return NextResponse.json({ error: 'User with this email not found' }, { status: 404 });
    }

    if (targetUser.familyId) {
        return NextResponse.json({ error: 'User is already in a family' }, { status: 400 });
    }

    // Add to family
    await prisma.user.update({
        where: { id: targetUser.id },
        data: {
            familyId: currentUser.familyId,
            familyRelation: relation,
            isFamilyHead: false
        }
    });

    // Notify the added member
    await createNotification(
      targetUser.id,
      'Welcome to the Family!',
      `You have been added to ${currentUser.name}'s family as ${relation}.`
    );

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
  }
}

// Remove Member
export async function DELETE(req: Request) {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
  
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token) as any;
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  
    try {
      const { searchParams } = new URL(req.url);
      const memberId = searchParams.get('id');

      if (!memberId) return NextResponse.json({ error: 'Member ID required' }, { status: 400 });

      const currentUser = await prisma.user.findUnique({ where: { id: payload.userId } });
      
      if (!currentUser || !currentUser.familyId || !currentUser.isFamilyHead) {
         return NextResponse.json({ error: 'Only Family Head can remove members' }, { status: 403 });
      }

      if (memberId === currentUser.id) {
         return NextResponse.json({ error: 'Cannot remove yourself (Head)' }, { status: 400 });
      }

      // Check if target is in same family
      const targetUser = await prisma.user.findUnique({ where: { id: memberId } });
      if (!targetUser || targetUser.familyId !== currentUser.familyId) {
         return NextResponse.json({ error: 'Member not found in your family' }, { status: 404 });
      }

      // Remove from family
      await prisma.user.update({
          where: { id: memberId },
          data: {
              familyId: null,
              familyRelation: null,
              isFamilyHead: false
          }
      });

      // Notify the removed member
      await createNotification(
        memberId,
        'Family Membership Update',
        `You have been removed from the family group.`
      );

      return NextResponse.json({ ok: true });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }
}
