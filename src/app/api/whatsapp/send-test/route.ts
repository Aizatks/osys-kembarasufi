import { NextRequest, NextResponse } from 'next/server';
import { whatsappManager } from '@/lib/whatsapp-service';
import { requireWhatsAppAuth, validateStaffId } from '@/lib/whatsapp-auth';

const PHONE_REGEX = /^[0-9]{10,15}$/;
const MAX_MESSAGE_LENGTH = 4096;

export async function POST(request: NextRequest) {
  const auth = await requireWhatsAppAuth(request);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { staffId, number, message } = await request.json();
    
    const validation = validateStaffId(staffId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    if (!number || typeof number !== 'string') {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const cleanPhone = number.replace(/\D/g, '');
    if (!PHONE_REGEX.test(cleanPhone)) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` }, { status: 400 });
    }

    await whatsappManager.sendMessage(staffId, cleanPhone, message);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error sending test message:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
