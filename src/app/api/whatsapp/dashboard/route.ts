import { NextRequest, NextResponse } from 'next/server';
import { requireWhatsAppAuth } from '@/lib/whatsapp-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const auth = await requireWhatsAppAuth(request);
  if (!auth.authorized) return auth.response;

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const threeMonthsAgoStr = threeMonthsAgo.toISOString();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

  const { data: sessions } = await supabaseAdmin
    .from('whatsapp_sessions')
    .select('staff_id, status, phone_number');

  const staffIds = (sessions || []).map(s => s.staff_id);

  const staffMap: Record<string, string> = {};
  if (staffIds.length > 0) {
    const { data: staffData } = await supabaseAdmin
      .from('staff')
      .select('id, name')
      .in('id', staffIds);
    for (const s of staffData || []) {
      staffMap[s.id] = s.name;
    }
  }

  const { count: totalMsgCount } = await supabaseAdmin
    .from('whatsapp_messages')
    .select('*', { count: 'exact', head: true })
    .gte('timestamp', startOfMonth);

  const { count: inboundCount } = await supabaseAdmin
    .from('whatsapp_messages')
    .select('*', { count: 'exact', head: true })
    .gte('timestamp', startOfMonth)
    .eq('from_me', false);

  const { count: outboundCount } = await supabaseAdmin
    .from('whatsapp_messages')
    .select('*', { count: 'exact', head: true })
    .gte('timestamp', startOfMonth)
    .eq('from_me', true);

  const { count: prevInbound } = await supabaseAdmin
    .from('whatsapp_messages')
    .select('*', { count: 'exact', head: true })
    .gte('timestamp', prevMonthStart)
    .lte('timestamp', prevMonthEnd)
    .eq('from_me', false);

  const { count: prevOutbound } = await supabaseAdmin
    .from('whatsapp_messages')
    .select('*', { count: 'exact', head: true })
    .gte('timestamp', prevMonthStart)
    .lte('timestamp', prevMonthEnd)
    .eq('from_me', true);

  const { data: uniqueContactsData } = await supabaseAdmin
    .from('whatsapp_messages')
    .select('remote_jid')
    .gte('timestamp', startOfMonth)
    .eq('from_me', false);

  const uniqueContacts = new Set((uniqueContactsData || []).map(m => m.remote_jid)).size;

  const { data: prevUniqueData } = await supabaseAdmin
    .from('whatsapp_messages')
    .select('remote_jid')
    .gte('timestamp', prevMonthStart)
    .lte('timestamp', prevMonthEnd)
    .eq('from_me', false);

  const prevUniqueContacts = new Set((prevUniqueData || []).map(m => m.remote_jid)).size;

  const staffMetrics = [];
  for (const sid of staffIds) {
    const { count: staffInbound } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('*', { count: 'exact', head: true })
      .eq('staff_id', sid)
      .gte('timestamp', startOfMonth)
      .eq('from_me', false);

    const { count: staffOutbound } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('*', { count: 'exact', head: true })
      .eq('staff_id', sid)
      .gte('timestamp', startOfMonth)
      .eq('from_me', true);

    const { data: staffContactsData } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('remote_jid')
      .eq('staff_id', sid)
      .gte('timestamp', startOfMonth)
      .eq('from_me', false);

    const staffUniqueContacts = new Set((staffContactsData || []).map(m => m.remote_jid)).size;

    const { data: responseTimes } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('timestamp, from_me, remote_jid')
      .eq('staff_id', sid)
      .gte('timestamp', startOfMonth)
      .order('timestamp', { ascending: true })
      .limit(2000);

    let totalResponseTime = 0;
    let responseCount = 0;
    const lastInbound: Record<string, string> = {};

    for (const msg of responseTimes || []) {
      if (!msg.from_me) {
        lastInbound[msg.remote_jid] = msg.timestamp;
      } else if (lastInbound[msg.remote_jid]) {
        const diff = new Date(msg.timestamp).getTime() - new Date(lastInbound[msg.remote_jid]).getTime();
        if (diff > 0 && diff < 24 * 60 * 60 * 1000) {
          totalResponseTime += diff;
          responseCount++;
        }
        delete lastInbound[msg.remote_jid];
      }
    }

    const avgResponseMs = responseCount > 0 ? totalResponseTime / responseCount : 0;
    const unreplied = Object.keys(lastInbound).length;

    staffMetrics.push({
      staff_id: sid,
      staff_name: staffMap[sid] || 'Unknown',
      status: (sessions || []).find(s => s.staff_id === sid)?.status || 'disconnected',
      inbound: staffInbound || 0,
      outbound: staffOutbound || 0,
      unique_contacts: staffUniqueContacts,
      avg_response_ms: avgResponseMs,
      unreplied,
    });
  }

  const { data: dailyData } = await supabaseAdmin
    .from('whatsapp_messages')
    .select('timestamp, from_me')
    .gte('timestamp', startOfMonth)
    .order('timestamp', { ascending: true });

  const dailyMap: Record<string, { inbound: number; outbound: number }> = {};
  for (const msg of dailyData || []) {
    const day = msg.timestamp.split('T')[0];
    if (!dailyMap[day]) dailyMap[day] = { inbound: 0, outbound: 0 };
    if (msg.from_me) dailyMap[day].outbound++;
    else dailyMap[day].inbound++;
  }

  const dailyTrend = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, val]) => ({ date, ...val }));

  const { data: hourlyData } = await supabaseAdmin
    .from('whatsapp_messages')
    .select('timestamp')
    .gte('timestamp', startOfMonth);

  const hourlyMap: Record<number, number> = {};
  for (const msg of hourlyData || []) {
    const hour = new Date(msg.timestamp).getHours();
    hourlyMap[hour] = (hourlyMap[hour] || 0) + 1;
  }

  const hourlyPattern = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    label: `${String(i).padStart(2, '0')}:00`,
    count: hourlyMap[i] || 0,
  }));

  const peakHour = hourlyPattern.reduce((max, h) => h.count > max.count ? h : max, hourlyPattern[0]);

  const calcChange = (current: number, prev: number) => {
    if (prev === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - prev) / prev) * 100);
  };

  return NextResponse.json({
    overview: {
      total_messages: totalMsgCount || 0,
      inbound: inboundCount || 0,
      outbound: outboundCount || 0,
      active_contacts: uniqueContacts,
      inbound_change: calcChange(inboundCount || 0, prevInbound || 0),
      outbound_change: calcChange(outboundCount || 0, prevOutbound || 0),
      contacts_change: calcChange(uniqueContacts, prevUniqueContacts),
      connected_staff: (sessions || []).filter(s => s.status === 'connected').length,
      total_staff: staffIds.length,
    },
    staff_metrics: staffMetrics.sort((a, b) => (b.inbound + b.outbound) - (a.inbound + a.outbound)),
    daily_trend: dailyTrend,
    hourly_pattern: hourlyPattern,
    peak_hour: peakHour,
  });
}
