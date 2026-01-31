import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, hashPassword } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = verifyToken(token) as any;
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tier: true,
        points: true,
        referralCode: true,
        phoneNumber: true,
        dateOfBirth: true,
        avatarUrl: true,
        permissions: true,
        createdAt: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = verifyToken(token) as any;
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, email, password, phoneNumber, dateOfBirth, verificationCode, avatarUrl } = body;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);
    if (avatarUrl) updateData.avatarUrl = avatarUrl;
    
    if (password) {
      // Require verification code for password change
      if (!verificationCode) {
        return NextResponse.json({ error: 'Verification code is required to change password' }, { status: 400 });
      }

      // Verify code
      if (user.verificationCode !== verificationCode || !user.verificationCodeExpiresAt || new Date() > user.verificationCodeExpiresAt) {
        return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
      }

      updateData.password = await hashPassword(password);
      
      // Clear verification code
      updateData.verificationCode = null;
      updateData.verificationCodeExpiresAt = null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tier: true,
        points: true,
        referralCode: true,
        phoneNumber: true,
        dateOfBirth: true,
        avatarUrl: true,
        createdAt: true,
      }
    });

    return NextResponse.json({ user: updatedUser, message: 'Profile updated successfully' });
  } catch (error: any) {
    console.error('API Update Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
