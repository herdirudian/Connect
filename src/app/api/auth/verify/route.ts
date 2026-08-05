import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
        return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.isVerified) {
        // If already verified, we can just log them in
        const token = signToken({ userId: user.id, role: user.role });
        const response = NextResponse.json({ 
            success: true,
            message: 'User already verified',
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
            token 
        });
        response.cookies.set('token', token, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });
        return response;
    }

    if (user.verificationCode !== code) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    if (user.verificationCodeExpiresAt && new Date() > user.verificationCodeExpiresAt) {
      return NextResponse.json({ error: 'Verification code expired' }, { status: 400 });
    }

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationCode: null,
        verificationCodeExpiresAt: null,
      },
    });

    // Process Referral Rewards
    if (user.referredById) {
      try {
          const referrer = await prisma.user.findUnique({ where: { id: user.referredById } });
          if (referrer) {
              // Fetch Dynamic Settings
              let referrerPoints = 50;
              let refereePoints = 20;

              try {
                // Use raw queries to bypass Prisma Client generation issues
                const rPointsData: any[] = await prisma.$queryRaw`SELECT value FROM SystemSetting WHERE \`key\` = 'referral_points_referrer'`;
                const nPointsData: any[] = await prisma.$queryRaw`SELECT value FROM SystemSetting WHERE \`key\` = 'referral_points_referee'`;

                if (rPointsData && rPointsData.length > 0) referrerPoints = parseInt(rPointsData[0].value);
                if (nPointsData && nPointsData.length > 0) refereePoints = parseInt(nPointsData[0].value);
              } catch (e) {
                console.warn('Could not fetch referral settings, using defaults', e);
              }

              // 1. Reward Referrer
              if (referrerPoints > 0) {
                  await prisma.$transaction(async (tx) => {
                      const updatedReferrer = await tx.user.update({
                          where: { id: referrer.id },
                          data: { points: { increment: referrerPoints } },
                          select: { id: true, points: true }
                      });
                      await tx.transaction.create({
                          data: {
                              userId: referrer.id,
                              amount: referrerPoints,
                              type: 'EARN',
                              description: `Referral Bonus for inviting ${user.name}`,
                              source: 'REFERRAL_BONUS',
                              balanceAfter: updatedReferrer.points,
                              referenceId: user.id
                          }
                      });
                  });
                  await createNotification(
                      referrer.id, 
                      'Referral Bonus!', 
                      `You earned ${referrerPoints} points because ${user.name} joined and verified their account.`
                  );
              }

              // 2. Reward New User
              if (refereePoints > 0) {
                  await prisma.$transaction(async (tx) => {
                      const updatedNewUser = await tx.user.update({
                          where: { id: user.id },
                          data: { points: { increment: refereePoints } },
                          select: { id: true, points: true }
                      });
                      await tx.transaction.create({
                          data: {
                              userId: user.id,
                              amount: refereePoints,
                              type: 'EARN',
                              description: `Welcome Bonus from ${referrer.name}`,
                              source: 'REFERRAL_WELCOME',
                              balanceAfter: updatedNewUser.points,
                              referenceId: referrer.id
                          }
                      });
                  });
                  await createNotification(
                      user.id, 
                      'Welcome Bonus!', 
                      `You received ${refereePoints} points for using ${referrer.name}'s referral code.`
                  );
              }
          }
      } catch (error) {
          console.error('Error processing referral rewards:', error);
      }
    }

    // Generate Token
    const token = signToken({ userId: user.id, role: user.role });

    const response = NextResponse.json({ 
      success: true,
      message: 'Email verified successfully',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token 
    });

    response.cookies.set('token', token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;

  } catch (error: any) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
