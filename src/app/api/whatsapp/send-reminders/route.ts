import { NextRequest, NextResponse } from 'next/server';
import { whatsappManager } from '@/lib/whatsapp-service';
import { supabaseAdmin } from '@/lib/supabase';
import { requireWhatsAppAuth, validateStaffId } from '@/lib/whatsapp-auth';

const PHONE_REGEX = /^[0-9]{10,15}$/;
const MAX_MESSAGE_LENGTH = 4096;
const MAX_REMINDERS_PER_BATCH = 100;

export async function POST(request: NextRequest) {
  const auth = await requireWhatsAppAuth(request);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { reminders, staffId } = await request.json();
    
    const validation = validateStaffId(staffId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    if (!reminders || !Array.isArray(reminders)) {
      return NextResponse.json({ error: 'Reminders must be an array' }, { status: 400 });
    }

    if (reminders.length > MAX_REMINDERS_PER_BATCH) {
      return NextResponse.json({ error: `Max ${MAX_REMINDERS_PER_BATCH} reminders per batch` }, { status: 400 });
    }

    const results = [];
    for (const reminder of reminders) {
      try {
        if (!reminder.phone || typeof reminder.phone !== 'string') {
          results.push({ id: reminder.id, status: 'failed', error: 'Invalid phone' });
          continue;
        }

        const cleanPhone = reminder.phone.replace(/\D/g, '');
        if (!PHONE_REGEX.test(cleanPhone)) {
          results.push({ id: reminder.id, status: 'failed', error: 'Invalid phone format' });
          continue;
        }

        if (!reminder.message || typeof reminder.message !== 'string' || reminder.message.length > MAX_MESSAGE_LENGTH) {
          results.push({ id: reminder.id, status: 'failed', error: 'Invalid message' });
          continue;
        }

        await whatsappManager.sendMessage(staffId, cleanPhone, reminder.message);
        
        await supabaseAdmin.from('activity_logs').insert({
          staff_id: staffId,
          action: 'SEND_WHATSAPP_REMINDER',
          details: { recipient: cleanPhone, customer_name: reminder.customer_name },
          created_at: new Date().toISOString()
        });

        results.push({ id: reminder.id, status: 'sent' });
      } catch (err: any) {
        results.push({ id: reminder.id, status: 'failed', error: err.message });
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
