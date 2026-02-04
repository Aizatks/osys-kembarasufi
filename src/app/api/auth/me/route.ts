import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'Token tidak dijumpai' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Token tidak sah atau telah tamat tempoh' },
        { status: 401 }
      );
    }

    const { data: staff, error } = await supabase
        .from('staff')
        .select('id, name, email, role, status, last_login, created_at, is_sales, category')
        .eq('id', payload.userId)
        .single();

    if (error || !staff) {
      return NextResponse.json(
        { error: 'Pengguna tidak dijumpai' },
        { status: 404 }
      );
    }

return NextResponse.json({
        user: {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          status: staff.status,
          category: staff.category,
          lastLogin: staff.last_login,
          createdAt: staff.created_at,
          isSales: staff.is_sales,
          impersonatedBy: payload.impersonatedBy,
          impersonatorName: payload.impersonatorName,
        },
      });
  } catch (error) {
    console.error('Get me error:', error);
    return NextResponse.json(
      { error: 'Ralat sistem. Sila cuba lagi.' },
      { status: 500 }
    );
  }
}
