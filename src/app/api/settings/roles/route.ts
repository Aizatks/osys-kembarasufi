import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

// Default roles to seed if table is empty or doesn't exist
const DEFAULT_ROLES = [
  { id: "unassigned", label: "Belum Ditetapkan", color: "bg-gray-100 text-gray-500", is_admin: false, is_system: true, sort_order: 0 },
  { id: "staff", label: "Sales", color: "bg-emerald-100 text-emerald-700", is_admin: false, is_system: true, sort_order: 1 },
  { id: "ejen", label: "Ejen", color: "bg-orange-100 text-orange-700", is_admin: false, is_system: false, sort_order: 2 },
  { id: "b2b", label: "B2B", color: "bg-teal-100 text-teal-700", is_admin: false, is_system: false, sort_order: 3 },
  { id: "introducer", label: "Introducer", color: "bg-lime-100 text-lime-700", is_admin: false, is_system: false, sort_order: 4 },
  { id: "marketing", label: "Marketing", color: "bg-pink-100 text-pink-700", is_admin: false, is_system: false, sort_order: 5 },
  { id: "media-videographic", label: "Media/Video", color: "bg-violet-100 text-violet-700", is_admin: false, is_system: false, sort_order: 6 },
  { id: "operation", label: "Operation", color: "bg-blue-100 text-blue-700", is_admin: false, is_system: false, sort_order: 7 },
  { id: "finance", label: "Finance", color: "bg-yellow-100 text-yellow-700", is_admin: false, is_system: false, sort_order: 8 },
  { id: "hr", label: "HR", color: "bg-rose-100 text-rose-700", is_admin: false, is_system: false, sort_order: 9 },
  { id: "tour-coordinator", label: "Tour Coordinator (PIC)", color: "bg-blue-100 text-blue-700", is_admin: false, is_system: false, sort_order: 10 },
  { id: "intern", label: "Intern", color: "bg-amber-100 text-amber-700", is_admin: false, is_system: false, sort_order: 11 },
  { id: "admin", label: "Admin", color: "bg-purple-100 text-purple-700", is_admin: true, is_system: true, sort_order: 20 },
  { id: "admin-manager", label: "Admin Manager", color: "bg-cyan-100 text-cyan-700", is_admin: true, is_system: false, sort_order: 21 },
  { id: "hr-manager", label: "HR Manager", color: "bg-cyan-100 text-cyan-700", is_admin: true, is_system: false, sort_order: 22 },
  { id: "finance-manager", label: "Finance Manager", color: "bg-cyan-100 text-cyan-700", is_admin: true, is_system: false, sort_order: 23 },
  { id: "tour-coordinator-manager", label: "TC Manager", color: "bg-cyan-100 text-cyan-700", is_admin: true, is_system: false, sort_order: 24 },
  { id: "sales-marketing-manager", label: "S&M Manager", color: "bg-cyan-100 text-cyan-700", is_admin: true, is_system: false, sort_order: 25 },
  { id: "asst-sales-marketing-manager", label: "Asst. S&M Manager", color: "bg-cyan-100 text-cyan-700", is_admin: true, is_system: false, sort_order: 26 },
  { id: "c-suite", label: "C-Suite", color: "bg-indigo-100 text-indigo-700", is_admin: true, is_system: false, sort_order: 30 },
  { id: "pengurus", label: "Pengurus", color: "bg-gray-100 text-gray-700", is_admin: true, is_system: false, sort_order: 31 },
  { id: "superadmin", label: "Superadmin", color: "bg-red-100 text-red-700", is_admin: true, is_system: true, sort_order: 99 },
];

async function ensureRolesTable() {
  // Try to read from roles table
  const { data, error } = await supabase.from('roles').select('id').limit(1);

  if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
    // Table doesn't exist — try creating via RPC or return defaults
    try {
      await supabase.rpc('exec_ddl', {
        ddl: `CREATE TABLE IF NOT EXISTS roles (
          id TEXT PRIMARY KEY,
          label TEXT NOT NULL,
          color TEXT DEFAULT 'bg-slate-100 text-slate-700',
          is_admin BOOLEAN DEFAULT false,
          is_system BOOLEAN DEFAULT false,
          sort_order INT DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT now()
        );`
      });
      // Seed default roles
      await supabase.from('roles').upsert(DEFAULT_ROLES, { onConflict: 'id' });
    } catch {
      // RPC might not exist — just return defaults
      return { fromDb: false, roles: DEFAULT_ROLES };
    }
  }

  if (!error && data && data.length === 0) {
    // Table exists but empty — seed it
    await supabase.from('roles').upsert(DEFAULT_ROLES, { onConflict: 'id' });
  }

  return { fromDb: true, roles: null };
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const tableCheck = await ensureRolesTable();
    if (!tableCheck.fromDb) {
      return NextResponse.json({ roles: tableCheck.roles });
    }

    const { data: roles, error } = await supabase
      .from('roles')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ roles: roles || DEFAULT_ROLES });
  } catch (error) {
    console.error('Roles GET error:', error);
    return NextResponse.json({ roles: DEFAULT_ROLES });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload || payload.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { id, label, color, is_admin, sort_order } = body;

    if (!id || !label) {
      return NextResponse.json({ error: 'ID dan Label diperlukan' }, { status: 400 });
    }

    await ensureRolesTable();

    const { data, error } = await supabase
      .from('roles')
      .upsert({ id, label, color: color || 'bg-slate-100 text-slate-700', is_admin: is_admin || false, is_system: false, sort_order: sort_order || 50 }, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;

    logActivity({
      staffId: payload.userId, staffName: payload.name, staffEmail: payload.email,
      action: 'manage_role',
      description: `Tambah/kemaskini peranan: ${label} (${id})`,
      metadata: { roleId: id, label, is_admin },
    });

    return NextResponse.json({ role: data });
  } catch (error: any) {
    console.error('Role POST error:', error);
    return NextResponse.json({ error: error.message || 'Ralat sistem' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload || payload.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const roleId = searchParams.get('id');
    if (!roleId) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });

    // Check if system role
    const { data: role } = await supabase.from('roles').select('is_system, label').eq('id', roleId).single();
    if (role?.is_system) {
      return NextResponse.json({ error: 'Peranan sistem tidak boleh dipadam' }, { status: 400 });
    }

    // Check if any staff uses this role
    const { count } = await supabase.from('staff').select('*', { count: 'exact', head: true }).eq('role', roleId);
    if (count && count > 0) {
      return NextResponse.json({ error: `Tidak boleh padam — ${count} staff masih menggunakan peranan ini` }, { status: 400 });
    }

    const { error } = await supabase.from('roles').delete().eq('id', roleId);
    if (error) throw error;

    // Also clean up permissions for this role
    await supabase.from('role_permissions').delete().eq('role', roleId);

    logActivity({
      staffId: payload.userId, staffName: payload.name, staffEmail: payload.email,
      action: 'delete_role',
      description: `Padam peranan: ${role?.label || roleId}`,
      metadata: { roleId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Role DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Ralat sistem' }, { status: 500 });
  }
}
