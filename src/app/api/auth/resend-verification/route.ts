import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/email';
import { z } from 'zod';

const resendSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = resendSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    if (user.isVerified) {
      return NextResponse.json({ error: 'Email sudah terverifikasi' }, { status: 400 });
    }

    // Check if previous code was sent recently (e.g., within last 1 minute) to prevent spam
    // For now, we'll just generate a new one.

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode,
        verificationCodeExpiresAt,
      },
    });

    await sendVerificationEmail(email, verificationCode);

    return NextResponse.json({ message: 'Kode verifikasi berhasil dikirim ulang' });
  } catch (error: any) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal mengirim ulang kode' },
      { status: 500 }
    );
  }
}
