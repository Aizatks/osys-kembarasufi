import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { sendPasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email diperlukan' }, { status: 400 });
    }

    // Always return success (don't reveal if email exists)
    const genericResponse = NextResponse.json({
      message: 'Jika email berdaftar, link reset telah dihantar.'
    });

    // Find staff
    const { data: staff } = await supabase
      .from('staff')
      .select('id, name, email')
      .eq('email', email.toLowerCase())
      .single();

    if (!staff) return genericResponse;

    // Generate secure token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    // Store token — use upsert so only one active token per staff
    // Try to create table if not exists first
    try {
      await supabase.rpc('exec_ddl', {
        ddl: `CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          staff_id UUID NOT NULL,
          token TEXT NOT NULL UNIQUE,
          expires_at TIMESTAMPTZ NOT NULL,
          used BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT now()
        );`
      });
    } catch {
      // RPC might not exist — table may already exist
    }

    // Delete any existing tokens for this staff
    await supabase.from('password_reset_tokens').delete().eq('staff_id', staff.id);

    // Insert new token
    const { error: insertError } = await supabase
      .from('password_reset_tokens')
      .insert({ staff_id: staff.id, token: resetToken, expires_at: expiresAt });

    if (insertError) {
      console.error('Token insert error:', insertError);
      return genericResponse;
    }

    // Send email
    await sendPasswordResetEmail(staff.email, staff.name, resetToken);

    return genericResponse;
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({
      message: 'Jika email berdaftar, link reset telah dihantar.'
    });
  }
}
