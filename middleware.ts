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
  const response = await handleMiddleware(req);

  // Add security headers to all responses
  const securityHeaders = {
    'X-DNS-Prefetch-Control': 'on',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-XSS-Protection': '1; mode=block',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.xendit.co https://*.sentry.io https://*.google-analytics.com https://*.googletagmanager.com https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://*.unsplash.com https://*.xendit.co https://*.cloudinary.com",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.xendit.co https://*.sentry.io https://*.google-analytics.com https://cloudflareinsights.com",
      "frame-src 'self' https://*.xendit.co",
      "media-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'"
    ].join('; ')
  };

  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

async function handleMiddleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const method = req.method;

  // 1. CSRF Protection for non-GET API requests
  // Skip CSRF for Xendit webhooks and Cron jobs as they come from outside
  const isExcludedPath = pathname.startsWith('/api/webhooks/xendit') || pathname.startsWith('/api/cron');
  if (pathname.startsWith('/api') && !isExcludedPath && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    const referer = req.headers.get('referer');

    // Simple CSRF check: Origin must match Host or Referer must start with App URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const isSameOrigin = origin && (origin === `https://${host}` || origin === `http://${host}` || (appUrl && origin === appUrl));
    
    // In production, we should be stricter. For now, we allow if no origin (e.g. from mobile app) 
    // but if origin exists it must match.
    if (origin && !isSameOrigin) {
        return new NextResponse('Invalid Origin (CSRF)', { status: 403 });
    }
  }

  // 2. Rate Limiting for API routes
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
