import { NextRequest, NextResponse } from 'next/server';
import { whatsappManager } from '@/lib/whatsapp-service';
import { withAuth } from '@/lib/api-auth';
import QRCode from 'qrcode';

export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get('staffId');

  if (!staffId) {
    return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 });
  }

  // Verify user can only check their own status (unless admin)
  if (staffId !== user.userId && !['admin', 'superadmin'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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
});
