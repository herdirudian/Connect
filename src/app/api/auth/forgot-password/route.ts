import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';
import rateLimit from '@/lib/rate-limit';

const limiter = rateLimit({
  interval: 60 * 1000 * 15, // 15 minutes
  uniqueTokenPerInterval: 500,
});

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    let rateLimitHeaders: any;
    try {
      rateLimitHeaders = await limiter.check(NextResponse.next(), 3, ip);
    } catch (headers: any) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan. Silakan coba lagi dalam 15 menit.' }, { status: 429, headers });
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal that the user does not exist
      return NextResponse.json({ message: 'If the email exists, a reset link has been sent.' });
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Create reset link
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    await sendPasswordResetEmail(email, resetLink);

    const response = NextResponse.json({ message: 'If the email exists, a reset link has been sent.' });

    if (rateLimitHeaders) {
      rateLimitHeaders.forEach((value: string, key: string) => {
        response.headers.set(key, value);
      });
    }

    return response;
  } catch (error: any) {
    console.error('Forgot password error:', error);

    // Handle Prisma schema mismatch (needs restart)
    if (error.message?.includes('Unknown argument') || error.message?.includes('Invalid `prisma.user.update()`')) {
      return NextResponse.json({ 
        error: 'System update required. Please restart the server to apply database changes.' 
      }, { status: 500 });
    }

    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
