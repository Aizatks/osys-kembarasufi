import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { verifyPassword, generateToken } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    const rateLimitResult = checkRateLimit(`login:${ip}`, RATE_LIMITS.login);
    
    if (!rateLimitResult.allowed) {
      const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Terlalu banyak percubaan log masuk. Sila cuba lagi kemudian.' },
        { 
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
          }
        }
      );
    }

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

    const token = await generateToken({
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
