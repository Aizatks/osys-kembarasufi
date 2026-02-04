import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { verifyPassword, generateToken } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Sila masukkan email dan kata laluan' },
        { status: 400 }
      );
    }

    const { data: staff, error } = await supabase
      .from('staff')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !staff) {
      return NextResponse.json(
        { error: 'Email atau kata laluan tidak sah' },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, staff.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Email atau kata laluan tidak sah' },
        { status: 401 }
      );
    }

    if (staff.status === 'pending') {
      return NextResponse.json(
        { error: 'Akaun anda masih menunggu kelulusan admin' },
        { status: 403 }
      );
    }

    if (staff.status === 'rejected') {
      return NextResponse.json(
        { error: 'Akaun anda telah ditolak. Sila hubungi admin.' },
        { status: 403 }
      );
    }

    if (staff.status === 'revoked') {
      return NextResponse.json(
        { error: 'Akses akaun anda telah dinyahaktif. Sila hubungi admin.' },
        { status: 403 }
      );
    }

    await supabase
      .from('staff')
      .update({ last_login: new Date().toISOString() })
      .eq('id', staff.id);

    const token = generateToken({
      userId: staff.id,
      email: staff.email,
      name: staff.name,
      role: staff.role,
    });

    const cookieStore = await cookies();
    cookieStore.set("session", JSON.stringify({ staffId: staff.id }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    await logActivity({
      staffId: staff.id,
      staffName: staff.name,
      staffEmail: staff.email,
      action: 'login',
      description: 'Log masuk ke sistem',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      message: 'Log masuk berjaya',
      token,
      user: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        status: staff.status,
        category: staff.category,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Ralat sistem. Sila cuba lagi.' },
      { status: 500 }
    );
  }
}
