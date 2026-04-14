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

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const staff_id = searchParams.get('staff_id');
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const isHR = HR_ROLES.includes(payload.role);

    if (type === 'entitlements') {
      let query = supabase.from('hr_leave_entitlements').select('*').eq('year', parseInt(year));
      if (staff_id) {
        query = query.eq('staff_id', staff_id);
      } else if (!isHR) {
        query = query.eq('staff_id', payload.userId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ entitlements: data || [] });
    }

    if (type === 'pending') {
      const { data, error } = await supabase
        .from('hr_leave_requests')
        .select('*')
        .or('status.eq.pending,status.eq.layer1_approved')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return NextResponse.json({ requests: data || [] });
    }

    // Default: get leave requests
    let query = supabase.from('hr_leave_requests').select('*').order('created_at', { ascending: false });
    if (staff_id) {
      query = query.eq('staff_id', staff_id);
    } else if (!isHR) {
      query = query.eq('staff_id', payload.userId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ requests: data || [] });
  } catch (error: any) {
    console.error('Leave GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // Apply for leave
    if (!action || action === 'apply') {
      const { leave_type_id, start_date, end_date, total_days, reason, attachment_url } = body;

      if (!leave_type_id || !start_date || !end_date || !total_days) {
        return NextResponse.json({ error: 'Maklumat cuti tidak lengkap' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('hr_leave_requests')
        .insert([{
          staff_id: payload.userId,
          staff_name: payload.name,
          leave_type_id,
          start_date,
          end_date,
          total_days,
          reason,
          attachment_url,
          status: 'pending',
        }])
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ request: data });
    }

    // Approve / Reject
    if (action === 'approve_l1' || action === 'reject_l1' || action === 'approve_l2' || action === 'reject_l2') {
      const { request_id, note } = body;
      if (!request_id) return NextResponse.json({ error: 'Request ID diperlukan' }, { status: 400 });

      const isLayer1 = action.includes('l1');
      const isApprove = action.startsWith('approve');

      const updateData: any = {};
      if (isLayer1) {
        updateData.layer1_approver_id = payload.userId;
        updateData.layer1_approver_name = payload.name;
        updateData.layer1_approved_at = new Date().toISOString();
        updateData.layer1_note = note;
        updateData.status = isApprove ? 'layer1_approved' : 'rejected';
      } else {
        updateData.layer2_approver_id = payload.userId;
        updateData.layer2_approver_name = payload.name;
        updateData.layer2_approved_at = new Date().toISOString();
        updateData.layer2_note = note;
        updateData.status = isApprove ? 'approved' : 'rejected';
      }

      const { data, error } = await supabase
        .from('hr_leave_requests')
        .update(updateData)
        .eq('id', request_id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ request: data });
    }

    // Set entitlements (HR only)
    if (action === 'set_entitlement') {
      if (!HR_ROLES.includes(payload.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const { staff_id, leave_type_id, year: entYear, total_days: entDays } = body;
      if (!staff_id || !leave_type_id) {
        return NextResponse.json({ error: 'Maklumat tidak lengkap' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('hr_leave_entitlements')
        .upsert({
          staff_id,
          leave_type_id,
          year: entYear || new Date().getFullYear(),
          total_days: entDays || 0,
        }, { onConflict: 'staff_id,leave_type_id,year' })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ entitlement: data, success: true });
    }

    return NextResponse.json({ error: 'Action tidak dikenali' }, { status: 400 });
  } catch (error: any) {
    console.error('Leave POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });

    const { data: request } = await supabase
      .from('hr_leave_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (!request) return NextResponse.json({ error: 'Tidak dijumpai' }, { status: 404 });

    if (request.staff_id !== payload.userId && !HR_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (request.status !== 'pending' && !HR_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: 'Hanya permohonan pending boleh dibatalkan' }, { status: 400 });
    }

    const { error } = await supabase.from('hr_leave_requests').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
