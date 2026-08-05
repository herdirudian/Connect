import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, signToken } from '@/lib/auth';
import { z } from 'zod';
import rateLimit from '@/lib/rate-limit';

const limiter = rateLimit({
  interval: 60 * 1000, // 60 seconds
  uniqueTokenPerInterval: 500, // Max 500 users per second
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(req: Request) {
  try {
    // Check Rate Limit (5 requests per minute per IP)
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    let rateLimitHeaders: any;
    try {
      rateLimitHeaders = await limiter.check(NextResponse.next(), 5, ip);
    } catch (headers: any) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan login. Silakan coba lagi nanti.' }, { status: 429, headers });
    }
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !(await comparePassword(password, user.password))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!user.isVerified) {
        return NextResponse.json({ 
            error: 'Email belum diverifikasi. Silakan cek email Anda.',
            needVerification: true,
            email: user.email 
        }, { status: 403 });
    }

    const token = signToken({ 
      userId: user.id, 
      role: user.role,
      permissions: user.permissions 
    });

    const response = NextResponse.json({ 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        permissions: user.permissions
      },
      token 
    });

    // Attach Rate Limit headers
    if (rateLimitHeaders) {
      rateLimitHeaders.forEach((value: string, key: string) => {
        response.headers.set(key, value);
      });
    }

    response.cookies.set('token', token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
