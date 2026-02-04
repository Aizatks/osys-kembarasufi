import { NextRequest, NextResponse } from 'next/server';
import { whatsappManager } from '@/lib/whatsapp-service';
import { requireWhatsAppAuth, validateStaffId } from '@/lib/whatsapp-auth';

const PHONE_REGEX = /^[0-9]{10,15}$/;

export async function POST(request: NextRequest) {
  const auth = await requireWhatsAppAuth(request);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { staffId, phoneNumber } = await request.json();
    
    const validation = validateStaffId(staffId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (!PHONE_REGEX.test(cleanPhone)) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    const code = await whatsappManager.requestPairingCode(staffId, cleanPhone);
    return NextResponse.json({ code });
  } catch (error: any) {
    console.error('Error requesting pairing code:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
