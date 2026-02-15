import { NextRequest, NextResponse } from 'next/server';
import { requireWhatsAppAuth } from '@/lib/whatsapp-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const auth = await requireWhatsAppAuth(request);
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get('staffId');
  const jid = searchParams.get('jid');

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  if (jid && staffId) {
    const { data: rawData, error } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('*')
      .eq('staff_id', staffId)
      .eq('remote_jid', jid)
      .gte('timestamp', threeMonthsAgo.toISOString())
      .order('timestamp', { ascending: false })
      .limit(500);

    const data = (rawData || []).reverse();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: contact } = await supabaseAdmin
      .from('whatsapp_contacts')
      .select('name, notify, picture_url')
      .eq('staff_id', staffId)
      .eq('jid', jid)
      .maybeSingle();

    const contactName = contact?.name || contact?.notify || null;
    const contactNumber = jid.replace('@s.whatsapp.net', '').replace('@g.us', '');

    const messages = (data || []).map(msg => ({
      id: msg.id,
      staff_id: msg.staff_id,
      jid: msg.remote_jid,
      sender_name: contactName || msg.push_name || msg.contact_name || contactNumber,
      sender_number: contactNumber,
      message_text: msg.text || '',
      message_type: msg.message_type || 'text',
      media_url: msg.media_url || null,
      is_from_me: msg.from_me,
      timestamp: msg.timestamp,
    }));

    return NextResponse.json({ messages, contact_name: contactName, picture_url: contact?.picture_url || null });
  }

  if (!staffId) {
    return NextResponse.json({ error: 'staffId required' }, { status: 400 });
  }

  const convMap: Record<string, any> = {};
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data: fallbackData, error: fallbackError } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('remote_jid, from_me, push_name, contact_name, text, message_type, timestamp')
      .eq('staff_id', staffId)
      .gte('timestamp', threeMonthsAgo.toISOString())
      .order('timestamp', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (fallbackError) return NextResponse.json({ error: fallbackError.message }, { status: 500 });
    if (!fallbackData || fallbackData.length === 0) break;

    for (const msg of fallbackData) {
      const key = msg.remote_jid;
    if (!convMap[key]) {
      const contactNumber = key.replace('@s.whatsapp.net', '').replace('@g.us', '');
      convMap[key] = {
        staff_id: staffId,
        jid: key,
        contact_name: contactNumber,
        contact_number: contactNumber,
        picture_url: null,
        last_message: msg.text || '',
        last_message_type: msg.message_type || 'text',
        last_timestamp: msg.timestamp,
        last_from_me: msg.from_me,
        total_messages: 0,
        unread_count: 0,
      };
    }
    convMap[key].total_messages++;
    if (!msg.from_me) convMap[key].unread_count++;
    const cn = convMap[key].contact_number;
    if (convMap[key].contact_name === cn) {
      if (msg.push_name && msg.push_name !== cn) convMap[key].contact_name = msg.push_name;
      else if (msg.contact_name && msg.contact_name !== cn) convMap[key].contact_name = msg.contact_name;
    }
  }

    if (fallbackData.length < pageSize) break;
    offset += pageSize;
  }

  const contactJids = Object.keys(convMap);
  if (contactJids.length > 0) {
    for (let i = 0; i < contactJids.length; i += 100) {
      const chunk = contactJids.slice(i, i + 100);
      const { data: contacts } = await supabaseAdmin
        .from('whatsapp_contacts')
        .select('jid, name, notify, picture_url')
        .eq('staff_id', staffId)
        .in('jid', chunk);

      for (const c of contacts || []) {
        if (convMap[c.jid]) {
          if (c.name || c.notify) convMap[c.jid].contact_name = c.name || c.notify;
          if (c.picture_url) convMap[c.jid].picture_url = c.picture_url;
        }
      }
    }
  }

  const conversations = Object.values(convMap).sort(
    (a: any, b: any) => new Date(b.last_timestamp).getTime() - new Date(a.last_timestamp).getTime()
  );

  return NextResponse.json({ conversations });
}
