import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { sendRewardClaimEmail } from '@/lib/email';
import { createNotification } from '@/lib/notifications';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    
    const decoded = verifyToken(token) as any;
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { rewardId } = body as { rewardId: string };
    if (!rewardId) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

    const [user, reward] = await Promise.all([
      prisma.user.findUnique({ where: { id: decoded.userId } }),
      prisma.reward.findUnique({ where: { id: rewardId } }),
    ]);
    if (!user || !reward || !reward.active) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    // Birthday validation (Allow H-3 to H-0)
    if (reward.type === 'BIRTHDAY') {
       if (!user.dateOfBirth) {
          return NextResponse.json({ error: 'Date of birth not set' }, { status: 400 });
       }
       const today = new Date();
       today.setHours(0, 0, 0, 0);
       const dob = new Date(user.dateOfBirth);
       const currentYear = today.getFullYear();
       
       const birthdayThisYear = new Date(currentYear, dob.getMonth(), dob.getDate());
       const diffTime = birthdayThisYear.getTime() - today.getTime();
       let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
       
       if (diffDays < 0) {
          // Check next year if passed
          const birthdayNextYear = new Date(currentYear + 1, dob.getMonth(), dob.getDate());
          const diffTimeNext = birthdayNextYear.getTime() - today.getTime();
          diffDays = Math.ceil(diffTimeNext / (1000 * 60 * 60 * 24));
       }
       
       if (diffDays > 3) {
          return NextResponse.json({ error: 'Reward can only be claimed 3 days before your birthday' }, { status: 400 });
       }
    }

    // Check if free reward is already claimed
    if (reward.cost === 0) {
      const existingClaim = await prisma.transaction.findFirst({
        where: {
          userId: user.id,
          source: `REWARD:${reward.id}`
        }
      });
      if (existingClaim) {
        return NextResponse.json({ error: 'You have already claimed this reward' }, { status: 400 });
      }
    }

    if (user.points < reward.cost) return NextResponse.json({ error: 'Insufficient points' }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { points: { decrement: reward.cost } },
        select: { id: true, points: true },
      });
      await tx.transaction.create({
        data: {
          userId: user.id,
          amount: reward.cost,
          type: 'REDEEM',
          description: `Redeem ${reward.name}`,
          source: `REWARD:${reward.id}`,
        },
      });

      const userReward = await tx.userReward.create({
        data: {
          userId: user.id,
          rewardId: reward.id,
          status: 'ACTIVE',
        },
      });
      
      return { user: updatedUser, userReward };
    });

    // Send email notification
    if (user.email) {
      await sendRewardClaimEmail(user.email, user.name || 'Member', reward.name, result.userReward.id);
    }

    // Send in-app notification
    await createNotification(
      user.id,
      'Reward Claimed!',
      `You have successfully claimed ${reward.name}. Check your email for details.`
    );

    return NextResponse.json({ ok: true, user: result.user, userReward: result.userReward });
  } catch (error) {
    console.error('Redeem error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      error: `Failed to redeem: ${errorMessage}`,
      details: errorMessage
    }, { status: 500 });
  }
}

