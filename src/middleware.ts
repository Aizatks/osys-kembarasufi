import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];
const PUBLIC_API_ROUTES = ['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/reset-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|ico|css|js|woff|woff2)$/)
  ) {
    return NextResponse.next();
  }

  // Allow public pages
  if (PUBLIC_ROUTES.includes(pathname) || pathname === '/') {
    return NextResponse.next();
  }

  // Allow public API routes
  if (PUBLIC_API_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // For API routes, check Authorization header or session cookie
  if (pathname.startsWith('/api/')) {
    const authHeader = request.headers.get('authorization');
    const sessionCookie = request.cookies.get('session');

    if (!authHeader && !sessionCookie) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.next();
  }

  // For page routes, allow through — auth is handled client-side by AuthContext
  // (session cookie may not be available in iframe/cross-origin contexts,
  //  but JWT token in localStorage still works)
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
