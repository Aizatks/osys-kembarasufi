import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader, JWTPayload } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

export function validateStaffId(staffId: string): { valid: boolean; error?: string } {
  if (!staffId) {
    return { valid: false, error: 'Staff ID is required' };
  }
  
  if (typeof staffId !== 'string') {
    return { valid: false, error: 'Staff ID must be a string' };
  }
  
  if (staffId.includes('..') || staffId.includes('/') || staffId.includes('\\') || staffId.includes('%')) {
    return { valid: false, error: 'Invalid Staff ID format' };
  }
  
  if (!isValidUUID(staffId)) {
    return { valid: false, error: 'Staff ID must be a valid UUID' };
  }
  
  return { valid: true };
}

const WHATSAPP_ALLOWED_ROLES = ['admin', 'superadmin', 'marketing', 'c-suite'];

export async function requireWhatsAppAuth(request: NextRequest): Promise<{
  authorized: boolean;
  user?: JWTPayload;
  response?: NextResponse;
}> {
  const authHeader = request.headers.get('authorization');
  const token = extractTokenFromHeader(authHeader);
  
  if (!token) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 }),
    };
  }
  
  const payload = verifyToken(token);
  
  if (!payload) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 }),
    };
  }
  
  const { data: staff } = await supabase
    .from('staff')
    .select('id, role, status')
    .eq('id', payload.userId)
    .single();
  
  if (!staff) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized - User not found' }, { status: 401 }),
    };
  }
  
  if (staff.status !== 'approved') {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized - Account not approved' }, { status: 403 }),
    };
  }
  
  if (!WHATSAPP_ALLOWED_ROLES.includes(staff.role)) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Forbidden - Insufficient permissions for WhatsApp access' }, { status: 403 }),
    };
  }
  
  return {
    authorized: true,
    user: payload,
  };
}
