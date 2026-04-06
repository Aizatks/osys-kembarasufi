import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const JWT_EXPIRES_IN = '24h';

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'staff' | 'superadmin' | 'marketing' | 'c-suite' | 'pengurus' | 'tour-coordinator' | 'tour-coordinator-manager' | 'ejen' | 'b2b' | 'intern' | 'asst-sales-marketing-manager';
  impersonatedBy?: string;
  impersonatorName?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcryptjs.compare(password, hashedPassword);
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// Central admin roles list — used by all APIs for authorization checks
export const ADMIN_ROLES = [
  'admin', 'superadmin', 'pengurus', 'c-suite',
  'sales-marketing-manager', 'asst-sales-marketing-manager',
  'admin-manager', 'hr-manager', 'finance-manager',
  'tour-coordinator-manager',
];

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role);
}

// Check RBAC: admin role OR permission in DB
export async function hasRBACAccess(role: string, viewId: string, supabaseClient: any): Promise<boolean> {
  if (ADMIN_ROLES.includes(role)) return true;
  try {
    const { data } = await supabaseClient
      .from('role_permissions')
      .select('is_enabled')
      .eq('role', role)
      .eq('view_id', viewId)
      .single();
    return !!data?.is_enabled;
  } catch {
    return false;
  }
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

export function generateQuotationNo(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `KS${year}${month}${day}-${random}`;
}
