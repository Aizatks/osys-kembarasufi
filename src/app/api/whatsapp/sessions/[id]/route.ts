import { NextRequest, NextResponse } from 'next/server';
import { whatsappManager } from '@/lib/whatsapp-service';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const { data: session } = await supabaseAdmin
      .from('whatsapp_sessions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    const instance = whatsappManager.getInstance(id);
    
    return NextResponse.json({
      session: {
        ...session,
        live_status: instance?.status || 'disconnected',
        qr: instance?.qr || null,
        live_phone: instance?.phoneNumber || session.phone_number,
        live_profile_pic: instance?.profilePic || session.profile_pic
      }
    });
  } catch (error) {
    console.error('GET session error:', error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const body = await req.json();
    const { action, name } = body;
    
    if (action === 'connect') {
      const { data: session } = await supabaseAdmin
        .from('whatsapp_sessions')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      
      const instance = await whatsappManager.initInstance(id, session.name);
      
      return NextResponse.json({
        session: {
          ...session,
          live_status: instance.status,
          qr: instance.qr
        }
      });
    }
    
    if (action === 'disconnect') {
      await whatsappManager.disconnectInstance(id);
      return NextResponse.json({ success: true });
    }
    
    if (action === 'restart') {
      const { data: session } = await supabaseAdmin
        .from('whatsapp_sessions')
        .select('*')
        .eq('id', id)
        .single();
      
      const instance = await whatsappManager.restartInstance(id, session?.name || 'Unknown');
      
      return NextResponse.json({
        session: {
          ...session,
          live_status: instance.status,
          qr: instance.qr
        }
      });
    }
    
    if (name) {
      await supabaseAdmin
        .from('whatsapp_sessions')
        .update({ name })
        .eq('id', id);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT session error:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    await whatsappManager.disconnectInstance(id);
    
    await supabaseAdmin
      .from('whatsapp_sessions')
      .delete()
      .eq('id', id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE session error:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
