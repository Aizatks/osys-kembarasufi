import { NextRequest, NextResponse } from 'next/server';
import { requireWhatsAppAuth } from '@/lib/whatsapp-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const auth = await requireWhatsAppAuth(request);
  if (!auth.authorized) return auth.response;

  const { data: wasSessions } = await supabaseAdmin
    .from('whatsapp_sessions')
    .select('*');

  const { whatsappManager } = await import('@/lib/whatsapp-service');

  const sessions = [];
  for (const s of wasSessions || []) {
    const { data: staff } = await supabaseAdmin
      .from('staff')
      .select('name, phone_number')
      .eq('id', s.staff_id)
      .single();

    const { count } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('*', { count: 'exact', head: true })
      .eq('staff_id', s.staff_id);

    const liveStatus = await whatsappManager.getStatus(s.staff_id);
    const statusMap: Record<string, string> = {
      connected: 'CONNECTED',
      qr_ready: 'INITIALIZING',
      connecting: 'INITIALIZING',
      reconnecting: 'INITIALIZING',
    };

    sessions.push({
      id: s.staff_id,
      staff_id: s.staff_id,
      staff_name: staff?.name || 'Unknown',
      phone_number: staff?.phone_number || s.phone_number || '',
      status: statusMap[liveStatus] || 'DISCONNECTED',
      last_active: s.updated_at,
      msg_count: count || 0,
    });
  }

  return NextResponse.json({ sessions });
}

export async function POST(request: NextRequest) {
  const auth = await requireWhatsAppAuth(request);
  if (!auth.authorized) return auth.response;

  const { whatsappManager } = await import('@/lib/whatsapp-service');
  const { staffId } = await request.json();

  if (staffId) {
    const result = await whatsappManager.triggerSync(staffId);
    return NextResponse.json({ synced: result });
  }

  return NextResponse.json({ error: 'staffId required' }, { status: 400 });
}
