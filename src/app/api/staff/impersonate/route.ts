import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken, generateToken } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'superadmin') {
      return NextResponse.json({ error: 'Hanya Super Admin boleh impersonate' }, { status: 403 });
    }

    const body = await request.json();
    const { staffId } = body;

    if (!staffId) {
      return NextResponse.json({ error: 'ID staff diperlukan' }, { status: 400 });
    }

    const { data: targetStaff, error } = await supabase
      .from('staff')
      .select('id, name, email, role, status, category')
      .eq('id', staffId)
      .single();

    if (error || !targetStaff) {
      return NextResponse.json({ error: 'Staff tidak dijumpai' }, { status: 404 });
    }

    if (targetStaff.status !== 'approved') {
      return NextResponse.json({ error: 'Staff belum diluluskan' }, { status: 400 });
    }

    if (targetStaff.role === 'superadmin') {
      return NextResponse.json({ error: 'Tidak boleh impersonate Super Admin lain' }, { status: 400 });
    }

    const impersonationToken = generateToken({
      userId: targetStaff.id,
      email: targetStaff.email,
      name: targetStaff.name,
        role: targetStaff.role as 'admin' | 'staff' | 'superadmin' | 'marketing',
      impersonatedBy: payload.userId,
      impersonatorName: payload.name,
    });

    await logActivity({
      staffId: payload.userId,
      staffName: payload.name,
      staffEmail: payload.email,
      action: 'impersonate_start',
      description: `Mula impersonate ${targetStaff.name} (${targetStaff.email})`,
      metadata: { targetStaffId: targetStaff.id, targetStaffName: targetStaff.name },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      message: `Berjaya impersonate sebagai ${targetStaff.name}`,
      token: impersonationToken,
      user: {
        id: targetStaff.id,
        name: targetStaff.name,
        email: targetStaff.email,
        role: targetStaff.role,
        status: targetStaff.status,
        category: targetStaff.category,
        impersonatedBy: payload.userId,
        impersonatorName: payload.name,
      },
    });
  } catch (error) {
    console.error('Impersonate error:', error);
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
    if (!payload || !payload.impersonatedBy) {
      return NextResponse.json({ error: 'Tiada sesi impersonate aktif' }, { status: 400 });
    }

    const { data: originalUser, error } = await supabase
      .from('staff')
      .select('id, name, email, role, status, category')
      .eq('id', payload.impersonatedBy)
      .single();

    if (error || !originalUser) {
      return NextResponse.json({ error: 'Pengguna asal tidak dijumpai' }, { status: 404 });
    }

    await logActivity({
      staffId: originalUser.id,
      staffName: originalUser.name,
      staffEmail: originalUser.email,
      action: 'impersonate_end',
      description: `Tamat impersonate ${payload.name} (${payload.email})`,
      metadata: { impersonatedStaffId: payload.userId, impersonatedStaffName: payload.name },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    const originalToken = generateToken({
      userId: originalUser.id,
      email: originalUser.email,
      name: originalUser.name,
      role: originalUser.role as 'admin' | 'staff' | 'superadmin' | 'marketing',
    });

    return NextResponse.json({
      message: `Kembali sebagai ${originalUser.name}`,
      token: originalToken,
      user: {
        id: originalUser.id,
        name: originalUser.name,
        email: originalUser.email,
        role: originalUser.role,
        status: originalUser.status,
        category: originalUser.category,
      },
    });
  } catch (error) {
    console.error('End impersonate error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}
