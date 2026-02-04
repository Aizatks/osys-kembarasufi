import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verify(token, JWT_SECRET) as any;

    const { data: permissions, error } = await supabase
      .from('role_permissions')
      .select('*');

    if (error) throw error;

    return NextResponse.json({ permissions });
  } catch (error) {
    console.error('Permissions API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verify(token, JWT_SECRET) as any;

    if (decoded.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { role, viewId, isEnabled } = await req.json();

    const { data, error } = await supabase
      .from('role_permissions')
      .upsert({ role, view_id: viewId, is_enabled: isEnabled }, { onConflict: 'role,view_id' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ permission: data });
  } catch (error) {
    console.error('Permissions Update Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
