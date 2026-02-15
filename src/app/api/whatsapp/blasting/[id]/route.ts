import { NextRequest, NextResponse } from 'next/server';
import { requireWhatsAppAuth } from '@/lib/whatsapp-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { whatsappManager } from '@/lib/whatsapp-service';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireWhatsAppAuth(request);
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  const { data: campaign } = await supabaseAdmin
    .from('whatsapp_blast_campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: steps } = await supabaseAdmin
    .from('whatsapp_blast_steps')
    .select('*')
    .eq('campaign_id', id)
    .order('step_order', { ascending: true });

  const { data: recipients } = await supabaseAdmin
    .from('whatsapp_blast_recipients')
    .select('*')
    .eq('campaign_id', id)
    .order('created_at', { ascending: true })
    .limit(1000);

  const { count: totalRecipients } = await supabaseAdmin
    .from('whatsapp_blast_recipients')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', id);

  const { count: sentCount } = await supabaseAdmin
    .from('whatsapp_blast_recipients')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', id)
    .eq('status', 'sent');

  const { count: failedCount } = await supabaseAdmin
    .from('whatsapp_blast_recipients')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', id)
    .eq('status', 'failed');

  return NextResponse.json({
    campaign,
    steps: steps || [],
    recipients: recipients || [],
    stats: {
      total: totalRecipients || 0,
      sent: sentCount || 0,
      failed: failedCount || 0,
      pending: (totalRecipients || 0) - (sentCount || 0) - (failedCount || 0),
    }
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireWhatsAppAuth(request);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await request.json();

  if (body.action === 'start') {
    await supabaseAdmin
      .from('whatsapp_blast_campaigns')
      .update({ status: 'running', started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id);

    startBlastCampaign(id).catch(err => console.error('[Blast] Error:', err));
    return NextResponse.json({ success: true, message: 'Campaign started' });
  }

  if (body.action === 'pause') {
    await supabaseAdmin
      .from('whatsapp_blast_campaigns')
      .update({ status: 'paused', updated_at: new Date().toISOString() })
      .eq('id', id);
    return NextResponse.json({ success: true, message: 'Campaign paused' });
  }

  if (body.action === 'resume') {
    await supabaseAdmin
      .from('whatsapp_blast_campaigns')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', id);
    startBlastCampaign(id).catch(err => console.error('[Blast] Error:', err));
    return NextResponse.json({ success: true, message: 'Campaign resumed' });
  }

  const updates: any = { updated_at: new Date().toISOString() };
  if (body.name) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.scheduled_at) updates.scheduled_at = body.scheduled_at;
  if (body.min_delay_ms) updates.min_delay_ms = body.min_delay_ms;
  if (body.max_delay_ms) updates.max_delay_ms = body.max_delay_ms;
  if (body.daily_limit) updates.daily_limit = body.daily_limit;

  await supabaseAdmin.from('whatsapp_blast_campaigns').update(updates).eq('id', id);

  if (body.steps) {
    await supabaseAdmin.from('whatsapp_blast_steps').delete().eq('campaign_id', id);
    const stepRows = body.steps.map((s: any, idx: number) => ({
      campaign_id: id,
      step_order: idx + 1,
      message_type: s.message_type || 'text',
      message_text: s.message_text || '',
      media_url: s.media_url || null,
      delay_after_hours: s.delay_after_hours || 0,
    }));
    await supabaseAdmin.from('whatsapp_blast_steps').insert(stepRows);
  }

  if (body.recipients) {
    await supabaseAdmin.from('whatsapp_blast_recipients').delete().eq('campaign_id', id);
    const recipientRows = body.recipients.map((r: any) => ({
      campaign_id: id,
      phone_number: typeof r === 'string' ? r : (r.phone_number || r.phone),
      name: typeof r === 'string' ? null : (r.name || null),
    }));
    for (let i = 0; i < recipientRows.length; i += 100) {
      await supabaseAdmin.from('whatsapp_blast_recipients').insert(recipientRows.slice(i, i + 100));
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireWhatsAppAuth(request);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  await supabaseAdmin.from('whatsapp_blast_campaigns').delete().eq('id', id);
  return NextResponse.json({ success: true });
}

async function startBlastCampaign(campaignId: string) {
  const { data: campaign } = await supabaseAdmin
    .from('whatsapp_blast_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (!campaign || campaign.status !== 'running') return;

  const { data: steps } = await supabaseAdmin
    .from('whatsapp_blast_steps')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('step_order', { ascending: true });

  if (!steps || steps.length === 0) {
    await supabaseAdmin.from('whatsapp_blast_campaigns')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', campaignId);
    return;
  }

  const { data: pendingRecipients } = await supabaseAdmin
    .from('whatsapp_blast_recipients')
    .select('*')
    .eq('campaign_id', campaignId)
    .in('status', ['pending', 'sending'])
    .order('created_at', { ascending: true })
    .limit(campaign.daily_limit || 500);

  if (!pendingRecipients || pendingRecipients.length === 0) {
    await supabaseAdmin.from('whatsapp_blast_campaigns')
      .update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', campaignId);
    return;
  }

  let sentToday = 0;
  const dailyLimit = campaign.daily_limit || 500;

  for (const recipient of pendingRecipients) {
    const { data: freshCampaign } = await supabaseAdmin
      .from('whatsapp_blast_campaigns')
      .select('status')
      .eq('id', campaignId)
      .single();

    if (!freshCampaign || freshCampaign.status !== 'running') {
      console.log(`[Blast] Campaign ${campaignId} paused/stopped`);
      return;
    }

    if (sentToday >= dailyLimit) {
      console.log(`[Blast] Daily limit reached for campaign ${campaignId}`);
      return;
    }

    await supabaseAdmin.from('whatsapp_blast_recipients')
      .update({ status: 'sending' })
      .eq('id', recipient.id);

    const currentStepIdx = recipient.current_step || 0;
    const step = steps[currentStepIdx] || steps[0];

    try {
      const jid = recipient.phone_number.replace(/\D/g, '');
      
      if (step.message_type === 'text') {
        let messageText = step.message_text || '';
        messageText = messageText.replace(/\{name\}/gi, recipient.name || '');
        messageText = messageText.replace(/\{phone\}/gi, recipient.phone_number || '');
        
        await whatsappManager.sendMessage(campaign.instance_staff_id, jid, messageText);
      } else if (step.message_type === 'image' && step.media_url) {
        const sock = await whatsappManager.getClient(campaign.instance_staff_id);
        const targetJid = jid.includes('@s.whatsapp.net') ? jid : `${jid}@s.whatsapp.net`;
        await sock.sendMessage(targetJid, {
          image: { url: step.media_url },
          caption: step.message_text || undefined,
        });
      } else if (step.message_type === 'document' && step.media_url) {
        const sock = await whatsappManager.getClient(campaign.instance_staff_id);
        const targetJid = jid.includes('@s.whatsapp.net') ? jid : `${jid}@s.whatsapp.net`;
        await sock.sendMessage(targetJid, {
          document: { url: step.media_url },
          caption: step.message_text || undefined,
          fileName: 'document.pdf',
        });
      } else {
        let messageText = step.message_text || '';
        messageText = messageText.replace(/\{name\}/gi, recipient.name || '');
        await whatsappManager.sendMessage(campaign.instance_staff_id, jid, messageText);
      }

      await supabaseAdmin.from('whatsapp_blast_recipients')
        .update({ status: 'sent', current_step: currentStepIdx + 1, last_sent_at: new Date().toISOString() })
        .eq('id', recipient.id);

      await supabaseAdmin.from('whatsapp_blast_logs').insert({
        campaign_id: campaignId,
        recipient_id: recipient.id,
        step_id: step.id,
        status: 'sent',
      });

      sentToday++;
      console.log(`[Blast] Sent to ${recipient.phone_number} (${sentToday}/${dailyLimit})`);
    } catch (err: any) {
      console.error(`[Blast] Failed to send to ${recipient.phone_number}:`, err?.message);
      await supabaseAdmin.from('whatsapp_blast_recipients')
        .update({ status: 'failed', error_message: err?.message || 'Unknown error' })
        .eq('id', recipient.id);

      await supabaseAdmin.from('whatsapp_blast_logs').insert({
        campaign_id: campaignId,
        recipient_id: recipient.id,
        step_id: step.id,
        status: 'failed',
        error_message: err?.message || 'Unknown error',
      });
    }

    const minDelay = campaign.min_delay_ms || 3000;
    const maxDelay = campaign.max_delay_ms || 8000;
    const delay = minDelay + Math.random() * (maxDelay - minDelay);
    await new Promise(r => setTimeout(r, delay));
  }

  const { count: stillPending } = await supabaseAdmin
    .from('whatsapp_blast_recipients')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', 'pending');

  if (!stillPending || stillPending === 0) {
    await supabaseAdmin.from('whatsapp_blast_campaigns')
      .update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', campaignId);
    console.log(`[Blast] Campaign ${campaignId} completed`);
  }
}
