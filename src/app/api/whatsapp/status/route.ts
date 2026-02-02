import { NextResponse } from 'next/server';
import { whatsappManager } from '@/lib/whatsapp-service';
import QRCode from 'qrcode';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get('staffId');

  if (!staffId) {
    return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 });
  }

  const status = await whatsappManager.getStatus(staffId);
  const qr = await whatsappManager.getQR(staffId);
  const pairingCode = await whatsappManager.getPairingCode(staffId);
  
  let qrDataUrl = null;
  if (qr) {
    qrDataUrl = qr.startsWith('data:') ? qr : await QRCode.toDataURL(qr);
  }

  return NextResponse.json({
    status,
    qr: qrDataUrl,
    pairingCode,
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
}
