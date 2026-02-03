import { NextRequest, NextResponse } from 'next/server';
import { whatsappManager } from '@/lib/whatsapp-service';
import { withAuth } from '@/lib/api-auth';

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const { staffId } = await request.json();
    
    if (!staffId) {
      return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 });
    }

    // Verify user can only connect their own WhatsApp (unless admin)
    if (staffId !== user.userId && !['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Force initialization of client
    await whatsappManager.getClient(staffId);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error connecting to WhatsApp:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
