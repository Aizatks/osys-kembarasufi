import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || !['admin', 'superadmin'].includes(payload.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const role = searchParams.get('role');

    let query = supabase
      .from('staff')
      .select('id, name, email, role, status, category, is_sales, last_login, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (role) query = query.eq('role', role);

    const { data: staffList, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
    }

    return NextResponse.json({ staff: staffList });
  } catch (error) {
    console.error('Get staff error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || !['admin', 'superadmin'].includes(payload.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const body = await request.json();
    const { staffId, action, role } = body;

    if (!staffId || !action) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    switch (action) {
      case 'approve':
        updateData.status = 'approved';
        break;
      case 'reject':
        updateData.status = 'rejected';
        break;
      case 'revoke':
        updateData.status = 'revoked';
        break;
      case 'reactivate':
        updateData.status = 'approved';
        break;
        case 'changeRole':
          if (!role || !['staff', 'admin', 'marketing', 'c-suite', 'pengurus', 'tour-coordinator', 'ejen', 'sales-marketing-manager', 'admin-manager', 'hr-manager', 'finance-manager', 'tour-coordinator-manager', 'media-videographic', 'operation'].includes(role)) {
            return NextResponse.json({ error: 'Peranan tidak sah' }, { status: 400 });
          }
          updateData.role = role;
          updateData.is_sales = ['staff', 'ejen', 'sales-marketing-manager'].includes(role);
          break;
      default:
        return NextResponse.json({ error: 'Tindakan tidak sah' }, { status: 400 });
    }

    const { error } = await supabase
      .from('staff')
      .update(updateData)
      .eq('id', staffId);

    if (error) {
      return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Berjaya dikemaskini' });
  } catch (error) {
    console.error('Update staff error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'superadmin') {
      return NextResponse.json({ error: 'Hanya Super Admin boleh memadam' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('id');

    if (!staffId) {
      return NextResponse.json({ error: 'ID staff diperlukan' }, { status: 400 });
    }

    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', staffId);

    if (error) {
      return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Staff berjaya dipadam' });
  } catch (error) {
    console.error('Delete staff error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}
