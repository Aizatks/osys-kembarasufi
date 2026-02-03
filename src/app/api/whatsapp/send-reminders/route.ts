import { NextRequest, NextResponse } from 'next/server';
import { whatsappManager } from '@/lib/whatsapp-service';
import { supabaseAdmin } from '@/lib/supabase';
import { withAuth } from '@/lib/api-auth';

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const { reminders, staffId } = await request.json();
    
    if (!reminders || !Array.isArray(reminders) || !staffId) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Verify user can only send as themselves (unless admin)
    if (staffId !== user.userId && !['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized - Cannot send as another user' }, { status: 403 });
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
});
