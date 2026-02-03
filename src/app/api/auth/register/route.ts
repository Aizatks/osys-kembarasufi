import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword, generateToken } from '@/lib/auth';
import { isValidEmail, sanitizeString, isStrongPassword } from '@/lib/validation';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    const rateLimitResult = checkRateLimit(`register:${ip}`, RATE_LIMITS.login);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak percubaan pendaftaran. Sila cuba lagi kemudian.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { name, email, password, role = 'staff' } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Sila isi semua maklumat yang diperlukan' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Format email tidak sah' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordCheck = isStrongPassword(password);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: passwordCheck.errors.join('. ') },
        { status: 400 }
      );
    }

    // Sanitize name input
    const sanitizedName = sanitizeString(name);
    if (sanitizedName.length < 2 || sanitizedName.length > 100) {
      return NextResponse.json(
        { error: 'Nama mesti antara 2-100 aksara' },
        { status: 400 }
      );
    }

    const { data: existingStaff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingStaff) {
      return NextResponse.json(
        { error: 'Email ini sudah didaftarkan' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const { count } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true });

    const isFirstUser = count === 0;

    const { data: newStaff, error } = await supabase
      .from('staff')
      .insert({
        name: sanitizedName,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: isFirstUser ? 'superadmin' : role,
        status: isFirstUser ? 'approved' : 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
    }

    const token = await generateToken({
      userId: newStaff.id,
      email: newStaff.email,
      name: newStaff.name,
      role: newStaff.role,
    });

    return NextResponse.json({
      message: isFirstUser 
        ? 'Pendaftaran berjaya sebagai Super Admin' 
        : 'Pendaftaran berjaya. Sila tunggu kelulusan admin.',
      token: isFirstUser ? token : null,
        user: {
          id: newStaff.id,
          name: newStaff.name,
          email: newStaff.email,
          role: newStaff.role,
          status: newStaff.status,
          category: newStaff.category,
        },
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Ralat sistem. Sila cuba lagi.' },
      { status: 500 }
    );
  }
}
