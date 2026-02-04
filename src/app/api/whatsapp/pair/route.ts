import { NextResponse } from 'next/server';
import { whatsappManager } from '@/lib/whatsapp-service';

export async function POST(request: Request) {
  try {
    const { staffId, phoneNumber } = await request.json();
    
    if (!staffId || !phoneNumber) {
      return NextResponse.json({ error: 'Staff ID and phone number are required' }, { status: 400 });
    }

    const code = await whatsappManager.requestPairingCode(staffId, phoneNumber);
    return NextResponse.json({ code });
  } catch (error: any) {
    console.error('Error requesting pairing code:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
