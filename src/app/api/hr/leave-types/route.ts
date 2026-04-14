import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { verifyToken, extractTokenFromHeader } from "@/lib/auth";

const HR_ROLES = ['admin', 'superadmin', 'hr', 'hr-manager', 'c-suite'];

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { data, error } = await supabase
      .from('hr_leave_types')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ leaveTypes: data || [] });
  } catch (error: any) {
    console.error('Leave types GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !HR_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { id, label, short_code, default_days, is_paid, requires_doc, color, sort_order, is_active } = body;

    if (!id || !label || !short_code) {
      return NextResponse.json({ error: 'ID, label dan short code diperlukan' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('hr_leave_types')
      .upsert({
        id, label, short_code,
        default_days: default_days ?? 0,
        is_paid: is_paid ?? true,
        requires_doc: requires_doc ?? false,
        color: color ?? '#3b82f6',
        is_active: is_active ?? true,
        sort_order: sort_order ?? 50,
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ leaveType: data, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !HR_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });

    const { error } = await supabase.from('hr_leave_types').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
