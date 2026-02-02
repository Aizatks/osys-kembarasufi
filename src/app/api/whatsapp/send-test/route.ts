import { NextResponse } from 'next/server';
import { whatsappManager } from '@/lib/whatsapp-service';

export async function POST(request: Request) {
  try {
    const { staffId, number, message } = await request.json();
    
    if (!staffId || !number || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await whatsappManager.sendMessage(staffId, number, message);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error sending test message:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
