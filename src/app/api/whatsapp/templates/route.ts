import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withAuth, withRole } from '@/lib/api-auth';

export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const { data: templates, error } = await supabaseAdmin
      .from('whatsapp_templates')
      .select('*')
      .order('id');
    
    if (error) throw error;
    return NextResponse.json({ templates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const PUT = withRole(['admin', 'superadmin'], async (request: NextRequest, user) => {
  try {
    const { id, content } = await request.json();
    const { error } = await supabaseAdmin
      .from('whatsapp_templates')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
