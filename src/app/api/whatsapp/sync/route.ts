import { NextRequest, NextResponse } from 'next/server';
import { whatsappManager } from '@/lib/whatsapp-service';
import { withAuth } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { session_id, action, chat_count } = body;
    
    if (!session_id) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
    }

    // Verify user can only sync their own session (unless admin)
    if (session_id !== user.userId && !['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    if (action === 'history') {
      const result = await whatsappManager.syncHistory(session_id, chat_count || 100);
      return NextResponse.json({ success: true, ...result });
    }
    
    if (action === 'profile_pics') {
      const result = await whatsappManager.syncProfilePics(session_id);
      return NextResponse.json({ success: true, ...result });
    }
    
    // Default: sync both
    const historyResult = await whatsappManager.syncHistory(session_id, chat_count || 100);
    const picsResult = await whatsappManager.syncProfilePics(session_id);
    
    return NextResponse.json({
      success: true,
      history_synced: historyResult.synced,
      pics_synced: picsResult.synced
    });
  } catch (error) {
    console.error('POST sync error:', error);
    return NextResponse.json({ error: 'Failed to sync' }, { status: 500 });
  }
});
