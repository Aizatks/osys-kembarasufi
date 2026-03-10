import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

// Map nama bulan Malay/English → index bulan (0-based)
const MONTH_MAP: Record<string, number> = {
  'JAN': 0, 'FEB': 1, 'MAC': 2, 'MAR': 2, 'APR': 3,
  'MEI': 4, 'MAY': 4, 'JUN': 5, 'JUL': 6, 'OGO': 7, 'AUG': 7,
  'SEP': 8, 'OKT': 9, 'OCT': 9, 'NOV': 10, 'DIS': 11, 'DEC': 11
};

// Parse tarikh_trip dalam format teks range seperti "31 MAY-3 JUN 2026" atau "18 - 21 JUN 2026"
function parseTripStartDate(tarikh: string): Date | null {
  if (!tarikh) return null;
  const upper = tarikh.toUpperCase();

  // Extract tahun (4 digit)
  const yearMatch = upper.match(/\b(20\d{2})\b/);
  if (!yearMatch) return null;
  const year = parseInt(yearMatch[1]);

  // Split by '-' atau '–', ambil bahagian pertama
  const parts = upper.split(/\s*[-–]\s*/);
  const startPart = parts[0].trim();

  // Cari bulan dalam startPart dahulu, kemudian full string
  let monthNum = -1;
  for (const [abbr, num] of Object.entries(MONTH_MAP)) {
    if (startPart.includes(abbr)) { monthNum = num; break; }
  }
  if (monthNum === -1) {
    for (const [abbr, num] of Object.entries(MONTH_MAP)) {
      if (upper.includes(abbr)) { monthNum = num; break; }
    }
  }
  if (monthNum === -1) return null;

  const dayMatch = startPart.match(/\d+/);
  const dayNum = dayMatch ? parseInt(dayMatch[0]) : 1;
  return new Date(year, monthNum, dayNum);
}

// Fetch semua rows melepasi had 1000 menggunakan pagination
async function fetchAllRows<T>(
  buildQuery: (from: number, to: number) => ReturnType<typeof supabase.from>
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  let allData: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1) as { data: T[] | null; error: unknown };
    if (error || !data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return allData;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 });
    }

    const payload = verifyToken(token);
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
        case 'week': {
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          filterStart = weekStart.toISOString();
          filterEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();
          break;
        }
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

    // Fetch semua data dengan pagination (bypass 1000 limit)
    const [sales, leads, staffRes, allSales, weekLeads, monthSales] = await Promise.all([
      fetchAllRows((from, to) => {
        let q = supabase.from('sales_reports').select('*').range(from, to);
        if (filterStart) q = q.gte('date_closed', filterStart.split('T')[0]);
        if (filterEnd) q = q.lte('date_closed', filterEnd.split('T')[0]);
        if (staffId) q = q.eq('staff_id', staffId);
        return q;
      }),
      fetchAllRows((from, to) => {
        let q = supabase.from('lead_reports').select('*').range(from, to);
        if (filterStart) q = q.gte('date_lead', filterStart.split('T')[0]);
        if (filterEnd) q = q.lte('date_lead', filterEnd.split('T')[0]);
        if (staffId) q = q.eq('staff_id', staffId);
        return q;
      }),
      supabase.from('staff').select('id, name, role').eq('status', 'approved'),
      fetchAllRows((from, to) =>
        supabase.from('sales_reports').select('*').range(from, to)
      ),
      fetchAllRows((from, to) =>
        supabase.from('lead_reports').select('*')
          .gte('date_lead', thisWeekStart.toISOString().split('T')[0])
          .range(from, to)
      ),
      fetchAllRows((from, to) =>
        supabase.from('sales_reports').select('*')
          .gte('date_closed', thisMonthStart.toISOString().split('T')[0])
          .lt('date_closed', nextMonthStart.toISOString().split('T')[0])
          .range(from, to)
      ),
    ]);

    const staff = staffRes.data || [];

    const totalSales = sales.reduce((sum: number, s: Record<string, unknown>) => sum + (parseFloat(s.total as string) || 0), 0);
    const totalPaid = sales.reduce((sum: number, s: Record<string, unknown>) => sum + (parseFloat(s.paid as string) || 0), 0);
    const outstandingPayment = totalSales - totalPaid;
    const totalPax = monthSales.reduce((sum: number, s: Record<string, unknown>) => sum + (parseInt(s.jumlah_pax as string) || 0), 0);
    const totalLeads = leads.length;
    const closedLeads = leads.filter((l: Record<string, unknown>) => l.follow_up_status === 'Closed').length;
    const conversionRate = totalLeads > 0 ? ((closedLeads / totalLeads) * 100).toFixed(1) : '0';
    const newLeadsThisWeek = weekLeads.length;

    // Monthly trend
    const monthlyData: Record<string, { month: string; sales: number; leads: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
      monthlyData[key] = { month: monthNames[d.getMonth()], sales: 0, leads: 0 };
    }
    allSales.forEach((s: Record<string, unknown>) => {
      if (s.date_closed) {
        const [year, month] = (s.date_closed as string).split('-');
        const key = `${year}-${month}`;
        if (monthlyData[key]) monthlyData[key].sales += parseFloat(s.total as string) || 0;
      }
    });
    leads.forEach((l: Record<string, unknown>) => {
      if (l.date_lead) {
        const [year, month] = (l.date_lead as string).split('-');
        const key = `${year}-${month}`;
        if (monthlyData[key]) monthlyData[key].leads += 1;
      }
    });
    const salesTrend = Object.values(monthlyData);

    // Leads by source
    const leadSources: Record<string, number> = {};
    leads.forEach((l: Record<string, unknown>) => {
      const source = (l.lead_from as string) || 'LAIN-LAIN';
      leadSources[source] = (leadSources[source] || 0) + 1;
    });
    const leadsBySource = Object.entries(leadSources).map(([source, count]) => ({ source, count }));

    // Payment breakdown
    const paymentStatus: Record<string, number> = {};
    sales.forEach((s: Record<string, unknown>) => {
      const status = (s.status_bayaran as string) || 'Pending';
      paymentStatus[status] = (paymentStatus[status] || 0) + 1;
    });
    const paymentBreakdown = Object.entries(paymentStatus).map(([status, count]) => ({ status, count }));

    // Staff performance
    const staffPerformance: Record<string, { name: string; sales: number; leads: number; amount: number; pax: number }> = {};
    staff.forEach((s: Record<string, unknown>) => {
      staffPerformance[s.id as string] = { name: s.name as string, sales: 0, leads: 0, amount: 0, pax: 0 };
    });
    sales.forEach((s: Record<string, unknown>) => {
      if (s.staff_id && staffPerformance[s.staff_id as string]) {
        staffPerformance[s.staff_id as string].sales += 1;
        staffPerformance[s.staff_id as string].amount += parseFloat(s.total as string) || 0;
        staffPerformance[s.staff_id as string].pax += parseInt(s.jumlah_pax as string) || 0;
      }
    });
    leads.forEach((l: Record<string, unknown>) => {
      if (l.staff_id && staffPerformance[l.staff_id as string]) {
        staffPerformance[l.staff_id as string].leads += 1;
      }
    });
    const staffStats = Object.values(staffPerformance)
      .map(s => ({ ...s, closingRate: s.leads > 0 ? parseFloat(((s.sales / s.leads) * 100).toFixed(1)) : 0 }))
      .filter(s => s.sales > 0 || s.leads > 0)
      .sort((a, b) => b.amount - a.amount);
    const topStaff = staffStats;

    // Recent sales
    const recentSales = [...sales]
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => new Date(b.date_closed as string || 0).getTime() - new Date(a.date_closed as string || 0).getTime())
      .slice(0, 5)
      .map((s: Record<string, unknown>) => ({
        id: s.id,
        nama_pakej: s.nama_pakej,
        total: s.total,
        date_closed: s.date_closed,
        status_bayaran: s.status_bayaran,
        nama_wakil_peserta: s.nama_wakil_peserta,
      }));

    // Overdue follow-ups — group by staff untuk ranking
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueLeads = leads.filter((l: Record<string, unknown>) => {
      if (!l.date_follow_up || l.follow_up_status === 'Closed' || l.follow_up_status === 'Not Interested') return false;
      return new Date(l.date_follow_up as string) < today;
    });

    // Ranking by staff — kira berapa overdue per staff
    const staffOverdueCount: Record<string, { staffName: string; count: number; items: typeof overdueLeads }> = {};
    overdueLeads.forEach((l: Record<string, unknown>) => {
      const staffEntry = staff.find((s: Record<string, unknown>) => s.id === l.staff_id);
      const staffName = staffEntry ? (staffEntry.name as string) : 'Tiada Staff';
      const key = (l.staff_id as string) || 'none';
      if (!staffOverdueCount[key]) staffOverdueCount[key] = { staffName, count: 0, items: [] };
      staffOverdueCount[key].count += 1;
      staffOverdueCount[key].items.push(l);
    });

    // Flatten: hantar semua overdue, sorted by staff dengan paling banyak tertunggak dulu
    const overdueFollowUps = Object.values(staffOverdueCount)
      .sort((a, b) => b.count - a.count)
      .flatMap(entry =>
        entry.items
          .sort((a: Record<string, unknown>, b: Record<string, unknown>) => new Date(a.date_follow_up as string).getTime() - new Date(b.date_follow_up as string).getTime())
          .slice(0, 3) // top 3 per staff
          .map((l: Record<string, unknown>) => ({
            id: l.id,
            nama_pakej: l.nama_pakej,
            no_phone: l.no_phone,
            date_follow_up: l.date_follow_up,
            follow_up_status: l.follow_up_status,
            staff_name: entry.staffName,
            staff_overdue_count: entry.count,
          }))
      )
      .slice(0, 15);

    // Upcoming trips — hantar tarikh_trip asal DAN parsed ISO date
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const upcomingTrips = sales
      .filter((s: Record<string, unknown>) => {
        if (!s.tarikh_trip) return false;
        const tripDate = parseTripStartDate(s.tarikh_trip as string);
        if (!tripDate) return false;
        return tripDate >= today && tripDate <= thirtyDaysLater;
      })
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const dateA = parseTripStartDate(a.tarikh_trip as string);
        const dateB = parseTripStartDate(b.tarikh_trip as string);
        return (dateA?.getTime() || 0) - (dateB?.getTime() || 0);
      })
      .slice(0, 15)
      .map((s: Record<string, unknown>) => {
        const parsed = parseTripStartDate(s.tarikh_trip as string);
        return {
          id: s.id,
          nama_pakej: s.nama_pakej,
          tarikh_trip: s.tarikh_trip, // teks asal
          tarikh_trip_iso: parsed ? parsed.toISOString() : null, // ISO untuk countdown
          jumlah_pax: s.jumlah_pax,
          nama_wakil_peserta: s.nama_wakil_peserta,
          no_phone: s.no_phone,
        };
      });

    return NextResponse.json({
      summary: {
        totalSales,
        totalLeads,
        conversionRate: parseFloat(conversionRate),
        outstandingPayment,
        totalPax,
        newLeadsThisWeek,
      },
      charts: { salesTrend, leadsBySource, paymentBreakdown, staffStats },
      tables: { topStaff, recentSales, overdueFollowUps, upcomingTrips },
      staff,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}
