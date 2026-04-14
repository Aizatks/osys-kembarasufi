import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token dan kata laluan diperlukan' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Kata laluan mestilah sekurang-kurangnya 6 aksara' }, { status: 400 });
    }

    // Find valid token
    const { data: resetRecord, error: findError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (findError || !resetRecord) {
      return NextResponse.json({ error: 'Link reset tidak sah atau telah tamat tempoh' }, { status: 400 });
    }

    // Check expiry
    if (new Date(resetRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Link reset telah tamat tempoh. Sila minta semula.' }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update staff password
    const { error: updateError } = await supabase
      .from('staff')
      .update({ password: hashedPassword, updated_at: new Date().toISOString() })
      .eq('id', resetRecord.staff_id);

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
    }

    // Mark token as used
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('id', resetRecord.id);

    return NextResponse.json({ message: 'Kata laluan berjaya dikemaskini. Sila log masuk.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}
