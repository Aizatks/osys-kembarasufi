import { NextRequest, NextResponse } from 'next/server';
import { whatsappManager } from '@/lib/whatsapp-service';
import { withAuth } from '@/lib/api-auth';

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const { staffId, phoneNumber } = await request.json();
    
    if (!staffId || !phoneNumber) {
      return NextResponse.json({ error: 'Staff ID and phone number are required' }, { status: 400 });
    }

    // Verify user can only pair their own WhatsApp (unless admin)
    if (staffId !== user.userId && !['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const code = await whatsappManager.requestPairingCode(staffId, phoneNumber);
    return NextResponse.json({ code });
  } catch (error: any) {
    console.error('Error requesting pairing code:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
