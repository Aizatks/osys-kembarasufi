import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireWhatsAppAuth } from '@/lib/whatsapp-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_CONTENT_LENGTH = 10000;

export async function GET(request: NextRequest) {
  const auth = await requireWhatsAppAuth(request);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { data: templates, error } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .order('id');
    
    if (error) throw error;
    return NextResponse.json({ templates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireWhatsAppAuth(request);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { id, content } = await request.json();

    if (!id || typeof id !== 'number') {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json({ error: `Content too long (max ${MAX_CONTENT_LENGTH} characters)` }, { status: 400 });
    }

    const { error } = await supabase
      .from('whatsapp_templates')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
