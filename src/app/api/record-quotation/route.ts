import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxSSRvjHT9Xt1CgABjwaOnMEGFaCqIYYgEjRkeRyI5DACLYNhX9wd_xfuLBKGUIALvasQ/exec';

async function generateServerQuotationNo(): Promise<string> {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const datePrefix = `${dd}${mm}${yyyy}`;
  
  const { count } = await supabase
    .from('quotations')
    .select('*', { count: 'exact', head: true })
    .like('quotation_no', `${datePrefix}-%`);
  
  const nextNumber = (count || 0) + 1;
  return `${datePrefix}-${String(nextNumber).padStart(5, '0')}`;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    
    let staffId: string | null = null;
    let staffName = '-';
    let staffEmail = '-';
    
    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        staffId = payload.userId;
        staffName = payload.name;
        staffEmail = payload.email;
      }
    }

    const body = await request.json();
    const {
      packageName,
      tripDate,
      totalPax,
      totalAmount,
      deposit,
      staffNumber,
      remark,
      packageCount,
      customerName,
      customerPhone,
      customerEmail,
      pax,
      breakdown,
      fullBreakdown,
    } = body;
    
    const invoiceNumber = await generateServerQuotationNo();

    const timestamp = new Date().toLocaleString('ms-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    console.log('=== QUOTATION RECORD ===');
    console.log({
      timestamp,
      invoiceNumber,
      packageName,
      tripDate,
      totalPax,
      totalAmount: `RM ${totalAmount}`,
      deposit: `RM ${deposit}`,
      staffName: body.staffName || staffName,
      staffNumber,
      remark,
      packageCount,
    });
    console.log('========================');

    const { data: newQuotation, error: dbError } = await supabase
      .from('quotations')
      .insert({
        quotation_no: invoiceNumber,
        customer_name: customerName || 'Pelanggan',
        customer_phone: customerPhone || '-',
        customer_email: customerEmail || '',
        package_name: packageName,
        travel_date: tripDate,
        pax_adult: pax?.adult || totalPax || 0,
        pax_cwb: pax?.cwb || 0,
        pax_cwob: pax?.cwob || 0,
        pax_infant: pax?.infant || 0,
        total_amount: totalAmount,
        breakdown: breakdown || {},
        full_breakdown: fullBreakdown || {},
        status: 'draft',
        created_by: staffId,
        staff_name: body.staffName || staffName,
        notes: remark || '',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
    } else {
      console.log('Quotation saved to database:', newQuotation?.id);
      
      if (staffId) {
        await logActivity({
          staffId,
          staffName: body.staffName || staffName,
          staffEmail,
          action: 'create_quotation',
          description: `Buat sebut harga ${invoiceNumber} - ${packageName} (RM${totalAmount})`,
          metadata: { 
            quotationId: newQuotation?.id,
            quotationNo: invoiceNumber,
            packageName,
            totalAmount,
          },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        });
      }
    }

    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp,
          invoiceNumber,
          packageName,
          tripDate,
          totalPax,
          totalAmount,
          deposit,
          staffName: body.staffName || staffName,
          staffNumber,
          remark,
          packageCount,
        }),
      });
      
      const result = await response.text();
      console.log('Google Apps Script response:', result);
    } catch (sheetError) {
      console.error('Google Sheet error:', sheetError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Record saved',
      quotationId: newQuotation?.id,
      record: {
        timestamp,
        invoiceNumber,
        packageName,
        totalAmount,
      }
    });
  } catch (error) {
    console.error('Error recording quotation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record quotation' },
      { status: 500 }
    );
  }
}
