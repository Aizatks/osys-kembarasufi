import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken, verifyPassword, hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token tidak sah' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Sila masukkan kata laluan semasa dan kata laluan baharu' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Kata laluan baharu mestilah sekurang-kurangnya 6 aksara' },
        { status: 400 }
      );
    }

    // Get current user's hashed password
    const { data: staff, error: fetchError } = await supabase
      .from('staff')
      .select('id, password')
      .eq('id', payload.userId)
      .single();

    if (fetchError || !staff) {
      return NextResponse.json({ error: 'Pengguna tidak dijumpai' }, { status: 404 });
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, staff.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Kata laluan semasa tidak betul' },
        { status: 400 }
      );
    }

    // Hash and update new password
    const hashedPassword = await hashPassword(newPassword);
    const { error: updateError } = await supabase
      .from('staff')
      .update({
        password: hashedPassword,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.userId);

    if (updateError) {
      console.error('Update password error:', updateError);
      return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Kata laluan berjaya ditukar' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Ralat sistem. Sila cuba lagi.' }, { status: 500 });
  }
}
