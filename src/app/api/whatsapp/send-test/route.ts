import { NextRequest, NextResponse } from 'next/server';
import { whatsappManager } from '@/lib/whatsapp-service';
import { withAuth } from '@/lib/api-auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    // Rate limiting by user
    const rateLimitResult = checkRateLimit(`whatsapp:${user.userId}`, RATE_LIMITS.whatsappSend);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak mesej dihantar. Sila tunggu sebentar.' },
        { status: 429 }
      );
    }

    const { staffId, number, message } = await request.json();
    
    if (!staffId || !number || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user can only send as themselves (unless admin)
    if (staffId !== user.userId && !['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized - Cannot send as another user' }, { status: 403 });
    }

    await whatsappManager.sendMessage(staffId, number, message);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error sending test message:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
