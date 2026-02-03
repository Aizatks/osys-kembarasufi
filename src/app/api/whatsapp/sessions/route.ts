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
    
    const enrichedSessions = (sessions || []).map(session => {
      const liveInstance = instances[session.id];
      return {
        ...session,
        live_status: liveInstance?.status || 'disconnected',
        qr: liveInstance?.qr || null,
        live_phone: liveInstance?.phoneNumber || session.phone_number,
        live_profile_pic: liveInstance?.profilePic || session.profile_pic
      };
    });
    
    return NextResponse.json({ sessions: enrichedSessions });
  } catch (error) {
    console.error('GET sessions error:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, staff_id } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    const { data: session, error } = await supabaseAdmin
      .from('whatsapp_sessions')
      .insert({
        name,
        staff_id: staff_id || null,
        status: 'connecting'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    const instance = await whatsappManager.initInstance(session.id, name);
    
    return NextResponse.json({
      session: {
        ...session,
        qr: instance.qr,
        live_status: instance.status
      }
    });
  } catch (error) {
    console.error('POST sessions error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
