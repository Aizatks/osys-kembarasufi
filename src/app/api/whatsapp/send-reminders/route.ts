import { NextResponse } from 'next/server';
import { whatsappManager } from '@/lib/whatsapp-service';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { reminders, staffId } = await request.json();
    
    if (!reminders || !Array.isArray(reminders) || !staffId) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const results = [];
    for (const reminder of reminders) {
      try {
        await whatsappManager.sendMessage(staffId, reminder.phone, reminder.message);
        
        // Log activity
        await supabaseAdmin.from('activity_logs').insert({
          staff_id: staffId,
          action: 'SEND_WHATSAPP_REMINDER',
          details: { recipient: reminder.phone, customer_name: reminder.customer_name },
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
