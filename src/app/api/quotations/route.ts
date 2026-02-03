import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken, generateQuotationNo } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token tidak sah' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    let query = supabase.from('quotations').select('*', { count: 'exact' });
    
    if (payload.role === 'staff') {
      query = query.eq('created_by', payload.userId);
    }
    
    if (status) query = query.eq('status', status);
    if (search) {
      query = query.or(`quotation_no.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,package_name.ilike.%${search}%`);
    }
    if (dateFrom) {
      query = query.gte('created_at', `${dateFrom}T00:00:00`);
    }
    if (dateTo) {
      query = query.lte('created_at', `${dateTo}T23:59:59`);
    }

    const { data: quotations, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
    }

    return NextResponse.json({
      quotations: quotations?.map(q => ({
        _id: q.id,
        quotationNo: q.quotation_no,
        customerName: q.customer_name,
        customerPhone: q.customer_phone,
        customerEmail: q.customer_email,
        packageName: q.package_name,
        travelDate: q.travel_date,
        pax: {
          adult: q.pax_adult,
          cwb: q.pax_cwb,
          cwob: q.pax_cwob,
          infant: q.pax_infant,
        },
        totalAmount: q.total_amount,
        breakdown: q.breakdown,
        fullBreakdown: q.full_breakdown,
        notes: q.notes,
        status: q.status,
        staffName: q.staff_name,
        createdAt: q.created_at,
      })),
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Get quotations error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token tidak sah' }, { status: 401 });
    }

    const body = await request.json();
    const {
      customerName,
      customerPhone,
      customerEmail,
      packageName,
      travelDate,
      pax,
      totalAmount,
      breakdown,
      notes,
    } = body;

    if (!customerName || !customerPhone || !packageName || !travelDate || !pax || !totalAmount) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const { data: newQuotation, error } = await supabase
      .from('quotations')
      .insert({
        quotation_no: generateQuotationNo(),
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        package_name: packageName,
        travel_date: travelDate,
        pax_adult: pax.adult || 0,
        pax_cwb: pax.cwb || 0,
        pax_cwob: pax.cwob || 0,
        pax_infant: pax.infant || 0,
        total_amount: totalAmount,
        breakdown: breakdown || {},
        status: 'draft',
        created_by: payload.userId,
        staff_name: payload.name,
        notes,
      })
      .select()
      .single();

    if (error) {
      console.error('Insert quotation error:', error);
      return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Sebut harga berjaya disimpan',
      quotation: newQuotation,
    });
  } catch (error) {
    console.error('Create quotation error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token tidak sah' }, { status: 401 });
    }

    const body = await request.json();
    const { quotationId, status, notes } = body;

    if (!quotationId) {
      return NextResponse.json({ error: 'ID sebut harga diperlukan' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const { error } = await supabase
      .from('quotations')
      .update(updateData)
      .eq('id', quotationId);

    if (error) {
      return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Sebut harga berjaya dikemaskini' });
  } catch (error) {
    console.error('Update quotation error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token tidak sah' }, { status: 401 });
    }

    if (payload.role !== 'superadmin' && payload.role !== 'admin') {
      return NextResponse.json({ error: 'Hanya admin boleh padam sebut harga' }, { status: 403 });
    }

    const body = await request.json();
    const { quotationId } = body;

    if (!quotationId) {
      return NextResponse.json({ error: 'ID sebut harga diperlukan' }, { status: 400 });
    }

    const { error } = await supabase
      .from('quotations')
      .delete()
      .eq('id', quotationId);

    if (error) {
      console.error('Delete quotation error:', error);
      return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Sebut harga berjaya dipadam' });
  } catch (error) {
    console.error('Delete quotation error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}
