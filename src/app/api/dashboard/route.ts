import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

interface StaffRanking {
  staffId: string;
  staffName: string;
  quotationCount: number;
  totalAmount: number;
}

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

    const isAdminOrSuperAdmin = ['admin', 'superadmin'].includes(payload.role);
    
    if (!isAdminOrSuperAdmin) {
      return NextResponse.json({ error: 'Akses ditolak. Dashboard hanya untuk Admin.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const filterStart = dateFrom ? `${dateFrom}T00:00:00` : null;
    const filterEnd = dateTo ? `${dateTo}T23:59:59` : null;
    const hasDateFilter = filterStart || filterEnd;

    let totalQuotationsQuery = supabase.from('quotations').select('*', { count: 'exact', head: true });
    let confirmedQuotationsQuery = supabase.from('quotations').select('*', { count: 'exact', head: true }).eq('status', 'confirmed');
    let recentQuotationsQuery = supabase.from('quotations').select('id, quotation_no, customer_name, package_name, total_amount, status, created_at, staff_name').order('created_at', { ascending: false }).limit(5);
    let monthlyRevenueQuery = supabase.from('quotations').select('total_amount').eq('status', 'confirmed');
    let staffQuotationsQuery = supabase.from('quotations').select('created_by, staff_name, total_amount');

    if (hasDateFilter) {
      if (filterStart) {
        totalQuotationsQuery = totalQuotationsQuery.gte('created_at', filterStart);
        confirmedQuotationsQuery = confirmedQuotationsQuery.gte('created_at', filterStart);
        recentQuotationsQuery = recentQuotationsQuery.gte('created_at', filterStart);
        monthlyRevenueQuery = monthlyRevenueQuery.gte('created_at', filterStart);
        staffQuotationsQuery = staffQuotationsQuery.gte('created_at', filterStart);
      }
      if (filterEnd) {
        totalQuotationsQuery = totalQuotationsQuery.lte('created_at', filterEnd);
        confirmedQuotationsQuery = confirmedQuotationsQuery.lte('created_at', filterEnd);
        recentQuotationsQuery = recentQuotationsQuery.lte('created_at', filterEnd);
        monthlyRevenueQuery = monthlyRevenueQuery.lte('created_at', filterEnd);
        staffQuotationsQuery = staffQuotationsQuery.lte('created_at', filterEnd);
      }
    } else {
      monthlyRevenueQuery = monthlyRevenueQuery.gte('created_at', thisMonthStart.toISOString()).lt('created_at', nextMonthStart.toISOString());
      staffQuotationsQuery = staffQuotationsQuery.gte('created_at', thisMonthStart.toISOString()).lt('created_at', nextMonthStart.toISOString());
    }

    const [
      totalQuotationsRes,
      todayQuotationsRes,
      monthQuotationsRes,
      confirmedQuotationsRes,
      totalCustomersRes,
      pendingStaffRes,
      totalStaffRes,
      recentQuotationsRes,
      monthlyRevenueRes,
      staffQuotationsRes,
    ] = await Promise.all([
      totalQuotationsQuery,
      supabase.from('quotations').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()).lt('created_at', tomorrow.toISOString()),
      supabase.from('quotations').select('*', { count: 'exact', head: true }).gte('created_at', thisMonthStart.toISOString()).lt('created_at', nextMonthStart.toISOString()),
      supabase.from('quotations').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('staff').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('staff').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      recentQuotationsQuery,
      monthlyRevenueQuery,
      staffQuotationsQuery,
    ]);

    const monthlyRevenue = (monthlyRevenueRes.data || []).reduce((sum, q) => sum + (parseFloat(q.total_amount) || 0), 0);

    const staffIds = [...new Set((staffQuotationsRes.data || []).map(q => q.created_by).filter(Boolean))];
    const { data: staffList } = staffIds.length > 0 
      ? await supabase.from('staff').select('id, name').in('id', staffIds)
      : { data: [] };
    
    const staffNameMap = new Map<string, string>();
    (staffList || []).forEach(s => staffNameMap.set(s.id, s.name));

    const staffRankingMap = new Map<string, StaffRanking>();
    (staffQuotationsRes.data || []).forEach(q => {
      const staffId = q.created_by || '';
      const key = staffId || q.staff_name || 'unknown';
      const resolvedName = staffId ? (staffNameMap.get(staffId) || q.staff_name || 'Unknown') : (q.staff_name || 'Unknown');
      
      const existing = staffRankingMap.get(key);
      if (existing) {
        existing.quotationCount++;
        existing.totalAmount += parseFloat(q.total_amount) || 0;
      } else {
        staffRankingMap.set(key, {
          staffId: staffId,
          staffName: resolvedName,
          quotationCount: 1,
          totalAmount: parseFloat(q.total_amount) || 0,
        });
      }
    });

    const staffRanking = Array.from(staffRankingMap.values())
      .filter(s => s.staffName && s.staffName !== 'Unknown' && s.staffName !== '-')
      .sort((a, b) => b.quotationCount - a.quotationCount)
      .slice(0, 10);

    return NextResponse.json({
      stats: {
        totalQuotations: totalQuotationsRes.count || 0,
        todayQuotations: todayQuotationsRes.count || 0,
        monthQuotations: monthQuotationsRes.count || 0,
        confirmedQuotations: confirmedQuotationsRes.count || 0,
        totalCustomers: totalCustomersRes.count || 0,
        pendingStaff: pendingStaffRes.count || 0,
        totalStaff: totalStaffRes.count || 0,
        monthlyRevenue,
      },
      recentQuotations: (recentQuotationsRes.data || []).map(q => ({
        _id: q.id,
        quotationNo: q.quotation_no,
        customerName: q.customer_name,
        packageName: q.package_name,
        totalAmount: q.total_amount,
        status: q.status,
        createdAt: q.created_at,
        staffName: q.staff_name,
      })),
      staffRanking,
      topPackages: [],
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}
