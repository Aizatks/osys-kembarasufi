import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || !['admin', 'superadmin', 'pengurus', 'c-suite'].includes(payload.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId');
    const action = searchParams.get('action');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('activity_logs')
      .select('*', { count: 'exact' });

    if (staffId) query = query.eq('staff_id', staffId);
    if (action) query = query.eq('action', action);
    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo);
    if (search) {
      query = query.or(`staff_name.ilike.%${search}%,staff_email.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: logs, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Get activity logs error:', error);
      return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
    }

    return NextResponse.json({
      logs: logs?.map(log => ({
        id: log.id,
        staffId: log.staff_id,
        staffName: log.staff_name,
        staffEmail: log.staff_email,
        action: log.action,
        description: log.description,
        metadata: log.metadata,
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        impersonatedBy: log.impersonated_by,
        createdAt: log.created_at,
      })),
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}

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
    const { action, description, metadata } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action diperlukan' }, { status: 400 });
    }

    await logActivity({
      staffId: payload.userId,
      staffName: payload.name,
      staffEmail: payload.email,
      action,
      description,
      metadata,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      impersonatedBy: payload.impersonatedBy,
    });

    return NextResponse.json({ message: 'Log aktiviti berjaya disimpan' });
  } catch (error) {
    console.error('Log activity error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}
