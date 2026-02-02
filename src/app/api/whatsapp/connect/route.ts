import { NextResponse } from 'next/server';
import { whatsappManager } from '@/lib/whatsapp-service';

export async function POST(request: Request) {
  try {
    const { staffId } = await request.json();
    
    if (!staffId) {
      return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 });
    }

    // Force initialization of client
    await whatsappManager.getClient(staffId);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error connecting to WhatsApp:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
