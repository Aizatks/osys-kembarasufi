import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const staffCategory = searchParams.get('staffCategory');
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    let query = supabase
      .from('task_templates')
      .select('*')
      .order('sort_order', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('Get templates error:', error);
      return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
    }

    let filteredTemplates = templates || [];
    if (staffCategory) {
      filteredTemplates = filteredTemplates.filter(t => 
        !t.target_role || t.target_role.length === 0 || t.target_role.includes(staffCategory)
      );
    }

    return NextResponse.json({ templates: filteredTemplates });
  } catch (error) {
    console.error('Get templates error:', error);
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
    if (!payload || !['admin', 'superadmin', 'pengurus', 'c-suite'].includes(payload.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, category, target_role, points, is_mandatory, sort_order, indicator_type, weightage, attachment_requirement } = body;

    if (!title) {
      return NextResponse.json({ error: 'Tajuk diperlukan' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('task_templates')
      .insert({
        title,
        description: description || null,
        category: category || 'daily',
        target_role: target_role || null,
        points: points || 1,
        is_mandatory: is_mandatory || false,
        sort_order: sort_order || 0,
        indicator_type: indicator_type || 'KPI',
        weightage: weightage || 1,
        attachment_requirement: attachment_requirement || 'none',
        created_by: payload.userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Create template error:', error);
      return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
    }

    return NextResponse.json({ template: data, message: 'Template berjaya dicipta' });
  } catch (error) {
    console.error('Create template error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { id, title, description, category, target_role, points, is_mandatory, sort_order, is_active, indicator_type, weightage, attachment_requirement } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (target_role !== undefined) updateData.target_role = target_role;
    if (points !== undefined) updateData.points = points;
    if (is_mandatory !== undefined) updateData.is_mandatory = is_mandatory;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (indicator_type !== undefined) updateData.indicator_type = indicator_type;
    if (weightage !== undefined) updateData.weightage = weightage;
    if (attachment_requirement !== undefined) updateData.attachment_requirement = attachment_requirement;

    const { data, error } = await supabase
      .from('task_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update template error:', error);
      return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
    }

    return NextResponse.json({ template: data, message: 'Template berjaya dikemaskini' });
  } catch (error) {
    console.error('Update template error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    }

    const { error } = await supabase
      .from('task_templates')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Delete template error:', error);
      return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Template berjaya dipadam' });
  } catch (error) {
    console.error('Delete template error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}
