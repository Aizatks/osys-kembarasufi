import { NextRequest, NextResponse } from 'next/server';
import { requireWhatsAppAuth } from '@/lib/whatsapp-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const auth = await requireWhatsAppAuth(request);
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get('staffId');
  const jid = searchParams.get('jid');

  if (!staffId) return NextResponse.json({ error: 'staffId required' }, { status: 400 });

  if (jid) {
    const { whatsappManager } = await import('@/lib/whatsapp-service');

    if (typeof whatsappManager.getContactProfile === 'function') {
      const profile = await whatsappManager.getContactProfile(staffId, jid);
      return NextResponse.json(profile);
    }

    const { data: contact } = await supabaseAdmin
      .from('whatsapp_contacts')
      .select('*')
      .eq('staff_id', staffId)
      .eq('jid', jid)
      .maybeSingle();

    const { count: mediaCount } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('*', { count: 'exact', head: true })
      .eq('staff_id', staffId)
      .eq('remote_jid', jid)
      .in('message_type', ['image', 'video', 'document']);

    const { data: recentMedia } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('id, media_url, message_type, timestamp')
      .eq('staff_id', staffId)
      .eq('remote_jid', jid)
      .in('message_type', ['image', 'video'])
      .not('media_url', 'is', null)
      .order('timestamp', { ascending: false })
      .limit(12);

    return NextResponse.json({
      jid,
      name: contact?.name || contact?.notify || null,
      notify: contact?.notify || null,
      picture_url: contact?.picture_url || null,
      status: null,
      phone: jid.replace('@s.whatsapp.net', ''),
      groups: [],
      media_count: mediaCount || 0,
      recent_media: recentMedia || [],
    });
  }

  const { data: contacts, count } = await supabaseAdmin
    .from('whatsapp_contacts')
    .select('*', { count: 'exact' })
    .eq('staff_id', staffId)
    .like('jid', '%@s.whatsapp.net')
    .order('name', { ascending: true, nullsFirst: false })
    .limit(500);

  return NextResponse.json({ contacts: contacts || [], total: count || 0 });
}

export async function POST(request: NextRequest) {
  const auth = await requireWhatsAppAuth(request);
  if (!auth.authorized) return auth.response;

  const body = await request.json();
  const { staffId, action, jid, name } = body;

  if (!staffId) return NextResponse.json({ error: 'staffId required' }, { status: 400 });

  if (action === 'sync') {
    const { whatsappManager } = await import('@/lib/whatsapp-service');
    if (typeof whatsappManager.syncContacts === 'function') {
      const result = await whatsappManager.syncContacts(staffId);
      return NextResponse.json(result);
    }
    const result = await whatsappManager.triggerSync(staffId);
    return NextResponse.json({ synced: result });
  }

  if (action === 'save' && jid) {
    const { error } = await supabaseAdmin.from('whatsapp_contacts').upsert({
      staff_id: staffId,
      jid,
      name: name || null,
    }, { onConflict: 'staff_id,jid' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ saved: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
