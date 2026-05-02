import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

function decodeJwtRole(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
    
    // Check expiration
    if (json.exp && Date.now() >= json.exp * 1000) {
      return null;
    }
    
    return json.role || null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // 1. Rate Limiting for API routes
  if (pathname.startsWith('/api')) {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    
    // Stricter limit for Auth (5 req/min)
    if (pathname.startsWith('/api/auth')) {
      const { success, reset } = rateLimit(`${ip}:auth`, 5, 60000);
      if (!success) {
        return new NextResponse('Too Many Requests', {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
            'Content-Type': 'text/plain',
          },
        });
      }
    }
    // General Booking limit (10 req/min)
    else if (pathname.startsWith('/api/bookings')) {
      const { success, reset } = rateLimit(`${ip}:booking`, 10, 60000);
      if (!success) {
        return new NextResponse('Too Many Requests', {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
            'Content-Type': 'text/plain',
          },
        });
      }
    }
  }

  // 2. Admin/Staff Authentication
  if (pathname.startsWith('/admin')) {
    const cookie = req.headers.get('cookie') || '';
    const match = cookie.match(/(?:^|;\s*)token=([^;]+)/);
    const token = match ? decodeURIComponent(match[1]) : '';
    const role = token ? decodeJwtRole(token) : null;

    const allowedRoles = new Set(['ADMIN', 'STAFF', 'VERIFICATOR']);
    if (!token || !role || !allowedRoles.has(role)) {
      const url = new URL('/login', req.url);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/auth/:path*',
    '/api/bookings/:path*',
  ],
};
