import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, role = 'staff' } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Sila isi semua maklumat yang diperlukan' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Kata laluan mestilah sekurang-kurangnya 6 aksara' },
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
        name,
        email: email.toLowerCase(),
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

    const token = generateToken({
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
