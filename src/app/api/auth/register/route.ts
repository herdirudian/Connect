import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken, generateReferralCode } from '@/lib/auth';
import { z } from 'zod';
import { sendVerificationEmail } from '@/lib/email';
import { createNotification } from '@/lib/notifications';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  referralCode: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, phone, referralCode } = registerSchema.parse(body);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // Generate unique referral code
    let newReferralCode = generateReferralCode(name);
    while (await prisma.user.findUnique({ where: { referralCode: newReferralCode } })) {
      newReferralCode = generateReferralCode(name);
    }

    // Validate Referral Code (if provided)
    let referrerId: string | null = null;
    let referrerName: string | null = null;
    if (referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode },
      });
      if (referrer) {
        referrerId = referrer.id;
        referrerName = referrer.name;
      }
    }

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create user
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phoneNumber: phone,
        referralCode: newReferralCode,
        verificationCode,
        verificationCodeExpiresAt,
        isVerified: false,
        referredById: referrerId,
      },
    });

    // Send verification email
    try {
        await sendVerificationEmail(email, verificationCode);
    } catch (emailError) {
        console.error("Failed to send verification email", emailError);
        // We still continue, user can request resend later (need to implement resend)
    }

    // Create Welcome Notification
    await createNotification(
      user.id,
      'Welcome to The Lodge Connect!',
      'Thank you for joining us. Verify your email to unlock all features.'
    );

    return NextResponse.json({ 
      success: true,
      message: 'Registration successful. Please verify your email.',
      needVerification: true,
      email: user.email 
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
