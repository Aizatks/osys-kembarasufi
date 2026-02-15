import { NextRequest, NextResponse } from 'next/server';
import { requireWhatsAppAuth } from '@/lib/whatsapp-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const auth = await requireWhatsAppAuth(request);
  if (!auth.authorized) return auth.response;

  const { whatsappManager } = await import('@/lib/whatsapp-service');

  const { data: allStaff } = await supabaseAdmin
    .from('staff')
    .select('id, name, email, phone_number, role')
    .order('name');

  const { data: sessions } = await supabaseAdmin
    .from('whatsapp_sessions')
    .select('staff_id, phone_number, status, updated_at');

  const sessionMap = new Map<string, any>();
  for (const s of sessions || []) {
    sessionMap.set(s.staff_id, s);
  }

  const staffConnections = [];
  for (const staff of allStaff || []) {
    const session = sessionMap.get(staff.id);
    let liveStatus = 'none';
    let reconnectAttempts = 0;
    let hasReconnectTimer = false;

    try {
      liveStatus = await whatsappManager.getStatus(staff.id);
    } catch {
      liveStatus = session?.status || 'none';
    }

    try {
      if (typeof whatsappManager.getReconnectInfo === 'function') {
        const info = whatsappManager.getReconnectInfo(staff.id);
        reconnectAttempts = info.attempts;
        hasReconnectTimer = info.hasTimer;
      }
    } catch {}

    if (liveStatus === 'disconnected' && !session) liveStatus = 'none';

    const { count: msgCount } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('*', { count: 'exact', head: true })
      .eq('staff_id', staff.id);

    const { count: contactCount } = await supabaseAdmin
      .from('whatsapp_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('staff_id', staff.id);

    const { data: lastMsg } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('timestamp')
      .eq('staff_id', staff.id)
      .order('timestamp', { ascending: false })
      .limit(1);

    staffConnections.push({
      staff_id: staff.id,
      staff_name: staff.name,
      staff_email: staff.email,
      staff_role: staff.role,
      phone_number: session?.phone_number || staff.phone_number || null,
      wa_status: liveStatus,
      db_status: session?.status || 'none',
      last_session_update: session?.updated_at || null,
      last_message_at: lastMsg?.[0]?.timestamp || null,
      msg_count: msgCount || 0,
      contact_count: contactCount || 0,
      reconnect_attempts: reconnectAttempts,
      has_reconnect_timer: hasReconnectTimer,
      has_session: !!session,
    });
  }

  const connected = staffConnections.filter(s => s.wa_status === 'connected').length;
  const reconnecting = staffConnections.filter(s => s.wa_status === 'reconnecting').length;
  const disconnected = staffConnections.filter(s => s.has_session && s.wa_status !== 'connected' && s.wa_status !== 'reconnecting').length;
  const noSession = staffConnections.filter(s => !s.has_session).length;

  return NextResponse.json({
    staff: staffConnections,
    summary: { total: staffConnections.length, connected, reconnecting, disconnected, no_session: noSession },
  });
}
