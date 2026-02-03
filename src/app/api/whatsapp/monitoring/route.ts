import { NextRequest, NextResponse } from 'next/server';
import { whatsappManager } from '@/lib/whatsapp-service';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: sessions } = await supabaseAdmin
      .from('whatsapp_sessions')
      .select('*')
      .order('created_at', { ascending: false });
    
    const instances = whatsappManager.getAllInstances();
    
    const monitoringData = await Promise.all(
      (sessions || []).map(async (session) => {
        const liveInstance = instances[session.id];
        
        const { data: recentChats } = await supabaseAdmin
          .from('whatsapp_messages')
          .select('remote_jid, contact_name, contact_pic, content, timestamp, from_me')
          .eq('session_id', session.id)
          .order('timestamp', { ascending: false })
          .limit(100);
        
        const uniqueChats = new Map();
        (recentChats || []).forEach(msg => {
          if (!uniqueChats.has(msg.remote_jid)) {
            uniqueChats.set(msg.remote_jid, {
              remote_jid: msg.remote_jid,
              contact_name: msg.contact_name,
              contact_pic: msg.contact_pic,
              last_message: msg.content,
              last_message_time: msg.timestamp,
              from_me: msg.from_me
            });
          }
        });
        
        const { count: totalMessages } = await supabaseAdmin
          .from('whatsapp_messages')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.id);
        
        return {
          id: session.id,
          name: session.name,
          phone_number: liveInstance?.phoneNumber || session.phone_number,
          profile_pic: liveInstance?.profilePic || session.profile_pic,
          status: liveInstance?.status || 'disconnected',
          qr: liveInstance?.qr,
          total_messages: totalMessages || 0,
          recent_chats: Array.from(uniqueChats.values()).slice(0, 20)
        };
      })
    );
    
    return NextResponse.json({ instances: monitoringData });
  } catch (error) {
    console.error('GET monitoring error:', error);
    return NextResponse.json({ error: 'Failed to fetch monitoring data' }, { status: 500 });
  }
}
