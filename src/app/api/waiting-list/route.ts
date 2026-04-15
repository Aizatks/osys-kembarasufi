import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'));
    if (!token) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token tidak sah' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staff_id');

    let query = supabase
      .from('waiting_list')
      .select('*, staff:staff_id(id, name), trips:waiting_list_trips(*)')
      .order('created_at', { ascending: false });

    if (staffId && staffId !== 'all') {
      query = query.eq('staff_id', staffId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Waiting list fetch error:', error);
      return NextResponse.json({ error: 'Gagal memuatkan data' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Waiting list error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'));
    if (!token) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token tidak sah' }, { status: 401 });

    const body = await request.json();
    const { customer_name, no_phone, staff_id, lead_id, trips } = body;

    if (!customer_name && !no_phone) {
      return NextResponse.json({ error: 'Sila masukkan nama atau nombor telefon' }, { status: 400 });
    }

    // Create waiting list entry
    const { data: entry, error: entryError } = await supabase
      .from('waiting_list')
      .insert({
        customer_name: customer_name || '',
        no_phone: no_phone || '',
        staff_id: staff_id || payload.id,
        lead_id: lead_id || null,
      })
      .select()
      .single();

    if (entryError) {
      console.error('Insert waiting list error:', entryError);
      return NextResponse.json({ error: 'Gagal menambah rekod' }, { status: 500 });
    }

    // Create trips if provided
    if (trips && Array.isArray(trips) && trips.length > 0) {
      const tripRows = trips.map((t: { nama_pakej: string; tarikh_requested?: string; remark?: string }) => ({
        waiting_list_id: entry.id,
        nama_pakej: t.nama_pakej,
        tarikh_requested: t.tarikh_requested || '',
        remark: t.remark || '',
        status: 'pending',
      }));

      const { error: tripsError } = await supabase
        .from('waiting_list_trips')
        .insert(tripRows);

      if (tripsError) {
        console.error('Insert trips error:', tripsError);
      }
    }

    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    console.error('Waiting list create error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'));
    if (!token) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token tidak sah' }, { status: 401 });

    const body = await request.json();
    const { id, customer_name, no_phone, trips } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    }

    // Update main entry
    const { error: updateError } = await supabase
      .from('waiting_list')
      .update({
        customer_name: customer_name || '',
        no_phone: no_phone || '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Update waiting list error:', updateError);
      return NextResponse.json({ error: 'Gagal mengemaskini' }, { status: 500 });
    }

    // Replace trips — delete old, insert new
    if (trips && Array.isArray(trips)) {
      await supabase.from('waiting_list_trips').delete().eq('waiting_list_id', id);

      if (trips.length > 0) {
        const tripRows = trips.map((t: { nama_pakej: string; tarikh_requested?: string; remark?: string; status?: string }) => ({
          waiting_list_id: id,
          nama_pakej: t.nama_pakej,
          tarikh_requested: t.tarikh_requested || '',
          remark: t.remark || '',
          status: t.status || 'pending',
        }));

        await supabase.from('waiting_list_trips').insert(tripRows);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Waiting list update error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'));
    if (!token) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token tidak sah' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    }

    // Trips will cascade delete due to FK constraint
    const { error } = await supabase
      .from('waiting_list')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete waiting list error:', error);
      return NextResponse.json({ error: 'Gagal memadam' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Waiting list delete error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}
