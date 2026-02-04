import { NextRequest, NextResponse } from 'next/server';
import { whatsappManager } from '@/lib/whatsapp-service';
import { requireWhatsAppAuth, validateStaffId } from '@/lib/whatsapp-auth';

export async function POST(request: NextRequest) {
  const auth = await requireWhatsAppAuth(request);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { staffId } = await request.json();
    
    const validation = validateStaffId(staffId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    await whatsappManager.getClient(staffId);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error connecting to WhatsApp:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
