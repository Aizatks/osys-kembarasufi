import { NextRequest, NextResponse } from 'next/server';
import { whatsappManager } from '@/lib/whatsapp-service';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');
    const remoteJid = searchParams.get('remote_jid');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    let query = supabaseAdmin
      .from('whatsapp_messages')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }
    
    if (remoteJid) {
      query = query.eq('remote_jid', remoteJid);
    }
    
    const { data: messages, error } = await query;
    
    if (error) throw error;
    
    return NextResponse.json({ messages: messages || [] });
  } catch (error) {
    console.error('GET messages error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, remote_jid, content } = body;
    
    if (!session_id || !remote_jid || !content) {
      return NextResponse.json(
        { error: 'session_id, remote_jid, and content are required' },
        { status: 400 }
      );
    }
    
    const success = await whatsappManager.sendMessage(session_id, remote_jid, content);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to send message. Instance may not be connected.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST messages error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
