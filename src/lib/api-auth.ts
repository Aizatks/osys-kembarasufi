import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader, JWTPayload } from './auth';

export interface AuthenticatedRequest extends NextRequest {
  user: JWTPayload;
}

export type AuthenticatedHandler = (
  request: NextRequest,
  user: JWTPayload,
  context?: { params: Record<string, string> }
) => Promise<NextResponse>;

/**
 * Wrapper untuk API routes yang memerlukan authentication
 * Usage: export const GET = withAuth(async (req, user) => { ... });
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest, context?: { params: Record<string, string> }) => {
    try {
      const authHeader = request.headers.get('authorization');
      const token = extractTokenFromHeader(authHeader);

      if (!token) {
        return NextResponse.json(
          { error: 'Token tidak dijumpai' },
          { status: 401 }
        );
      }

      const user = await verifyToken(token);

      if (!user) {
        return NextResponse.json(
          { error: 'Token tidak sah atau telah tamat tempoh' },
          { status: 401 }
        );
      }

      return handler(request, user, context);
    } catch (error) {
      console.error('Auth error:', error);
      return NextResponse.json(
        { error: 'Ralat pengesahan' },
        { status: 401 }
      );
    }
  };
}

/**
 * Wrapper untuk routes yang memerlukan role tertentu
 * Usage: export const GET = withRole(['admin', 'superadmin'], async (req, user) => { ... });
 */
export function withRole(
  allowedRoles: JWTPayload['role'][],
  handler: AuthenticatedHandler
) {
  return withAuth(async (request, user, context) => {
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Akses ditolak - Role tidak dibenarkan' },
        { status: 403 }
      );
    }
    return handler(request, user, context);
  });
}

/**
 * Helper untuk extract user dari request dalam route yang sudah protected
 */
export async function getAuthUser(request: NextRequest): Promise<JWTPayload | null> {
  const authHeader = request.headers.get('authorization');
  const token = extractTokenFromHeader(authHeader);
  
  if (!token) return null;
  
  return verifyToken(token);
}
