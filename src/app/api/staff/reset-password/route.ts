import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken, hashPassword } from '@/lib/auth';

function generateRandomPassword(length: number = 8): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !['admin', 'superadmin'].includes(payload.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const body = await request.json();
    const { staffId, newPassword } = body;

    if (!staffId) {
      return NextResponse.json({ error: 'ID staff diperlukan' }, { status: 400 });
    }

    const { data: staff, error: fetchError } = await supabase
      .from('staff')
      .select('id, name, email, role')
      .eq('id', staffId)
      .single();

    if (fetchError || !staff) {
      return NextResponse.json({ error: 'Staff tidak dijumpai' }, { status: 404 });
    }

    if (staff.role === 'superadmin' && payload.role !== 'superadmin') {
      return NextResponse.json({ error: 'Tidak boleh reset password Super Admin' }, { status: 403 });
    }

    const passwordToSet = newPassword || generateRandomPassword();
    const hashedPassword = await hashPassword(passwordToSet);

    const { error: updateError } = await supabase
      .from('staff')
      .update({ 
        password: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', staffId);

    if (updateError) {
      console.error('Update password error:', updateError);
      return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Password berjaya di-reset',
      newPassword: passwordToSet,
      staffName: staff.name
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}
