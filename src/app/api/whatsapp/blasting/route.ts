import { NextRequest, NextResponse } from 'next/server';
import { requireWhatsAppAuth } from '@/lib/whatsapp-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const auth = await requireWhatsAppAuth(request);
  if (!auth.authorized) return auth.response;

  const { data: campaigns, error } = await supabaseAdmin
    .from('whatsapp_blast_campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const enriched = [];
  for (const c of campaigns || []) {
    const { count: totalRecipients } = await supabaseAdmin
      .from('whatsapp_blast_recipients')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', c.id);

    const { count: sentCount } = await supabaseAdmin
      .from('whatsapp_blast_recipients')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', c.id)
      .eq('status', 'sent');

    const { count: failedCount } = await supabaseAdmin
      .from('whatsapp_blast_recipients')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', c.id)
      .eq('status', 'failed');

    const { data: steps } = await supabaseAdmin
      .from('whatsapp_blast_steps')
      .select('*')
      .eq('campaign_id', c.id)
      .order('step_order', { ascending: true });

    const { count: deliveredCount } = await supabaseAdmin
      .from('whatsapp_blast_logs')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', c.id)
      .eq('status', 'delivered');

    const { count: readCount } = await supabaseAdmin
      .from('whatsapp_blast_logs')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', c.id)
      .eq('status', 'read');

    enriched.push({
      ...c,
      total_recipients: totalRecipients || 0,
      sent_count: sentCount || 0,
      failed_count: failedCount || 0,
      delivered_count: deliveredCount || 0,
      read_count: readCount || 0,
      steps: steps || [],
    });
  }

  return NextResponse.json({ campaigns: enriched });
}

export async function POST(request: NextRequest) {
  const auth = await requireWhatsAppAuth(request);
  if (!auth.authorized) return auth.response;

  const body = await request.json();
  const { name, description, instance_staff_id, scheduled_at, timezone, steps, recipients, min_delay_ms, max_delay_ms, daily_limit } = body;

  if (!name || !instance_staff_id) {
    return NextResponse.json({ error: 'name and instance_staff_id required' }, { status: 400 });
  }

  const { data: campaign, error: campError } = await supabaseAdmin
    .from('whatsapp_blast_campaigns')
    .insert({
      name,
      description: description || null,
      staff_id: auth.userId,
      instance_staff_id,
      status: 'draft',
      scheduled_at: scheduled_at || null,
      timezone: timezone || 'Asia/Kuala_Lumpur',
      min_delay_ms: min_delay_ms || 3000,
      max_delay_ms: max_delay_ms || 8000,
      daily_limit: daily_limit || 500,
    })
    .select()
    .single();

  if (campError) return NextResponse.json({ error: campError.message }, { status: 500 });

  if (steps && steps.length > 0) {
    const stepRows = steps.map((s: any, idx: number) => ({
      campaign_id: campaign.id,
      step_order: idx + 1,
      message_type: s.message_type || 'text',
      message_text: s.message_text || '',
      media_url: s.media_url || null,
      delay_after_hours: s.delay_after_hours || 0,
    }));
    await supabaseAdmin.from('whatsapp_blast_steps').insert(stepRows);
  }

  if (recipients && recipients.length > 0) {
    const recipientRows = recipients.map((r: any) => ({
      campaign_id: campaign.id,
      phone_number: r.phone_number || r.phone || r,
      name: r.name || null,
    }));
    for (let i = 0; i < recipientRows.length; i += 100) {
      await supabaseAdmin.from('whatsapp_blast_recipients').insert(recipientRows.slice(i, i + 100));
    }
  }

  return NextResponse.json({ campaign });
}
