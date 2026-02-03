import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

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
    const staffId = searchParams.get('staffId');
    const preset = searchParams.get('preset');

    const now = new Date();
    let filterStart: string | null = null;
    let filterEnd: string | null = null;

    if (preset) {
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      
      switch (preset) {
        case 'today':
          filterStart = today.toISOString();
          filterEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'week':
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          filterStart = weekStart.toISOString();
          filterEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'month':
          filterStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
          filterEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString();
          break;
        case 'year':
          filterStart = new Date(today.getFullYear(), 0, 1).toISOString();
          filterEnd = new Date(today.getFullYear() + 1, 0, 1).toISOString();
          break;
      }
    } else if (dateFrom || dateTo) {
      filterStart = dateFrom ? `${dateFrom}T00:00:00.000Z` : null;
      filterEnd = dateTo ? `${dateTo}T23:59:59.999Z` : null;
    }

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);

    let salesQuery = supabase.from('sales_reports').select('*');
    let leadsQuery = supabase.from('lead_reports').select('*');

    if (filterStart) {
      salesQuery = salesQuery.gte('date_closed', filterStart.split('T')[0]);
      leadsQuery = leadsQuery.gte('date_lead', filterStart.split('T')[0]);
    }
    if (filterEnd) {
      salesQuery = salesQuery.lte('date_closed', filterEnd.split('T')[0]);
      leadsQuery = leadsQuery.lte('date_lead', filterEnd.split('T')[0]);
    }
    if (staffId) {
      salesQuery = salesQuery.eq('staff_id', staffId);
      leadsQuery = leadsQuery.eq('staff_id', staffId);
    }

    const [salesRes, leadsRes, staffRes, allSalesRes, weekLeadsRes, monthSalesRes] = await Promise.all([
      salesQuery,
      leadsQuery,
      supabase.from('staff').select('id, name, role').eq('status', 'approved'),
      supabase.from('sales_reports').select('*'),
      supabase.from('lead_reports').select('*').gte('date_lead', thisWeekStart.toISOString().split('T')[0]),
      supabase.from('sales_reports').select('*').gte('date_closed', thisMonthStart.toISOString().split('T')[0]).lt('date_closed', nextMonthStart.toISOString().split('T')[0]),
    ]);

    const sales = salesRes.data || [];
    const leads = leadsRes.data || [];
    const staff = staffRes.data || [];

    const totalSales = sales.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
    const totalPaid = sales.reduce((sum, s) => sum + (parseFloat(s.paid) || 0), 0);
    const outstandingPayment = totalSales - totalPaid;
    const totalPax = (monthSalesRes.data || []).reduce((sum, s) => sum + (parseInt(s.jumlah_pax) || 0), 0);
    const totalLeads = leads.length;
    const closedLeads = leads.filter(l => l.follow_up_status === 'Closed').length;
    const conversionRate = totalLeads > 0 ? ((closedLeads / totalLeads) * 100).toFixed(1) : '0';
    const newLeadsThisWeek = (weekLeadsRes.data || []).length;

    const monthlyData: Record<string, { month: string; sales: number; leads: number }> = {};
    const allSales = allSalesRes.data || [];
    
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
      monthlyData[key] = { month: monthNames[d.getMonth()], sales: 0, leads: 0 };
    }

    allSales.forEach(s => {
      if (s.date_closed) {
        const [year, month] = s.date_closed.split('-');
        const key = `${year}-${month}`;
        if (monthlyData[key]) {
          monthlyData[key].sales += parseFloat(s.total) || 0;
        }
      }
    });

    (leadsRes.data || []).forEach(l => {
      if (l.date_lead) {
        const [year, month] = l.date_lead.split('-');
        const key = `${year}-${month}`;
        if (monthlyData[key]) {
          monthlyData[key].leads += 1;
        }
      }
    });

    const salesTrend = Object.values(monthlyData);

    const leadSources: Record<string, number> = {};
    leads.forEach(l => {
      const source = l.lead_from || 'LAIN-LAIN';
      leadSources[source] = (leadSources[source] || 0) + 1;
    });
    const leadsBySource = Object.entries(leadSources).map(([source, count]) => ({ source, count }));

    const paymentStatus: Record<string, number> = {};
    sales.forEach(s => {
      const status = s.status_bayaran || 'Pending';
      paymentStatus[status] = (paymentStatus[status] || 0) + 1;
    });
    const paymentBreakdown = Object.entries(paymentStatus).map(([status, count]) => ({ status, count }));

    const staffPerformance: Record<string, { name: string; sales: number; leads: number; amount: number }> = {};
    staff.forEach(s => {
      staffPerformance[s.id] = { name: s.name, sales: 0, leads: 0, amount: 0 };
    });
    
    sales.forEach(s => {
      if (s.staff_id && staffPerformance[s.staff_id]) {
        staffPerformance[s.staff_id].sales += 1;
        staffPerformance[s.staff_id].amount += parseFloat(s.total) || 0;
      }
    });
    
    leads.forEach(l => {
      if (l.staff_id && staffPerformance[l.staff_id]) {
        staffPerformance[l.staff_id].leads += 1;
      }
    });

    const staffStats = Object.values(staffPerformance)
      .filter(s => s.sales > 0 || s.leads > 0)
      .sort((a, b) => b.amount - a.amount);

    const topStaff = staffStats.slice(0, 5);

    const recentSales = sales
      .sort((a, b) => new Date(b.date_closed || 0).getTime() - new Date(a.date_closed || 0).getTime())
      .slice(0, 5)
      .map(s => ({
        id: s.id,
        nama_pakej: s.nama_pakej,
        total: s.total,
        date_closed: s.date_closed,
        status_bayaran: s.status_bayaran,
        nama_wakil_peserta: s.nama_wakil_peserta,
      }));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueFollowUps = leads
      .filter(l => {
        if (!l.date_follow_up || l.follow_up_status === 'Closed' || l.follow_up_status === 'Not Interested') return false;
        const followUpDate = new Date(l.date_follow_up);
        return followUpDate < today;
      })
      .sort((a, b) => new Date(a.date_follow_up).getTime() - new Date(b.date_follow_up).getTime())
      .slice(0, 5)
      .map(l => ({
        id: l.id,
        nama_pakej: l.nama_pakej,
        no_phone: l.no_phone,
        date_follow_up: l.date_follow_up,
        follow_up_status: l.follow_up_status,
      }));

    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    
    const upcomingTrips = sales
      .filter(s => {
        if (!s.tarikh_trip) return false;
        const tripDate = new Date(s.tarikh_trip);
        return tripDate >= today && tripDate <= thirtyDaysLater;
      })
      .sort((a, b) => new Date(a.tarikh_trip).getTime() - new Date(b.tarikh_trip).getTime())
      .slice(0, 5)
      .map(s => ({
        id: s.id,
        nama_pakej: s.nama_pakej,
        tarikh_trip: s.tarikh_trip,
        jumlah_pax: s.jumlah_pax,
        nama_wakil_peserta: s.nama_wakil_peserta,
      }));

    return NextResponse.json({
      summary: {
        totalSales,
        totalLeads,
        conversionRate: parseFloat(conversionRate),
        outstandingPayment,
        totalPax,
        newLeadsThisWeek,
      },
      charts: {
        salesTrend,
        leadsBySource,
        paymentBreakdown,
        staffStats,
      },
      tables: {
        topStaff,
        recentSales,
        overdueFollowUps,
        upcomingTrips,
      },
      staff,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}
