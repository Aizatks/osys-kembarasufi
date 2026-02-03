import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes yang tak perlu authentication
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/login',
  '/register',
  '/',
];

// Routes yang boleh access tanpa token (static assets, etc)
const IGNORED_ROUTES = [
  '/_next',
  '/favicon.ico',
  '/images',
  '/fonts',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip ignored routes
  if (IGNORED_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next();
  }

  // Check for authentication token
  const authHeader = request.headers.get('authorization');
  const sessionCookie = request.cookies.get('session');

  // For API routes, require Bearer token
  if (pathname.startsWith('/api/')) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Token required' },
        { status: 401 }
      );
    }

    // Token validation happens in API route handlers
    // Middleware just ensures token exists
    return NextResponse.next();
  }

  // For page routes, check session cookie
  if (!sessionCookie) {
    // Redirect to login page
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files
    '/((?!_next/static|_next/image|favicon.ico|images|fonts).*)',
  ],
};
