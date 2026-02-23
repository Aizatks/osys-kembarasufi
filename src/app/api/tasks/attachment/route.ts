import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

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

    const contentType = request.headers.get('content-type') || '';
    let taskId: string;
    let attachmentUrl: string;

    if (contentType.includes('application/json')) {
      // Handle link submission
      const body = await request.json();
      taskId = body.task_id;
      const link = body.link;

      if (!taskId || !link) {
        return NextResponse.json({ error: 'task_id dan link diperlukan' }, { status: 400 });
      }

      const { data: task } = await supabaseAdmin
        .from('daily_tasks')
        .select('staff_id')
        .eq('id', taskId)
        .single();

      if (!task) return NextResponse.json({ error: 'Task tidak dijumpai' }, { status: 404 });

      const isAdmin = ['admin', 'superadmin'].includes(payload.role);
      if (!isAdmin && task.staff_id !== payload.userId) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }

      attachmentUrl = link;
    } else {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get('file') as File;
      taskId = formData.get('task_id') as string;

      if (!file || !taskId) {
        return NextResponse.json({ error: 'Fail dan task_id diperlukan' }, { status: 400 });
      }

      const { data: task } = await supabaseAdmin
        .from('daily_tasks')
        .select('staff_id')
        .eq('id', taskId)
        .single();

      if (!task) return NextResponse.json({ error: 'Task tidak dijumpai' }, { status: 404 });

      const isAdmin = ['admin', 'superadmin'].includes(payload.role);
      if (!isAdmin && task.staff_id !== payload.userId) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }

      const ext = file.name.split('.').pop();
      const fileName = `${payload.userId}/${taskId}-${Date.now()}.${ext}`;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      const { error: uploadError } = await supabaseAdmin.storage
        .from('task-attachments')
        .upload(fileName, buffer, { contentType: file.type, upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return NextResponse.json({ error: 'Gagal upload fail' }, { status: 500 });
      }

      const { data: urlData } = supabaseAdmin.storage
        .from('task-attachments')
        .getPublicUrl(fileName);

      attachmentUrl = urlData.publicUrl;
    }

    const { data: updatedTask, error: updateError } = await supabaseAdmin
      .from('daily_tasks')
      .update({ attachment_url: attachmentUrl, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .select(`*, template:task_templates(id, title, description, category, points, is_mandatory, attachment_requirement)`)
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Gagal simpan URL' }, { status: 500 });
    }

    return NextResponse.json({ task: updatedTask, url: attachmentUrl });
  } catch (error) {
    console.error('Attachment upload error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token tidak sah' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('task_id');

    if (!taskId) return NextResponse.json({ error: 'task_id diperlukan' }, { status: 400 });

    const { data: task } = await supabaseAdmin
      .from('daily_tasks')
      .select('staff_id, attachment_url')
      .eq('id', taskId)
      .single();

    if (!task) return NextResponse.json({ error: 'Task tidak dijumpai' }, { status: 404 });

    const isAdmin = ['admin', 'superadmin'].includes(payload.role);
    if (!isAdmin && task.staff_id !== payload.userId) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    // Remove attachment_url from task
    const { data: updatedTask } = await supabaseAdmin
      .from('daily_tasks')
      .update({ attachment_url: null, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .select(`*, template:task_templates(id, title, description, category, points, is_mandatory, attachment_requirement)`)
      .single();

    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    console.error('Delete attachment error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}
