import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

const ADMIN_ROLES = ['admin', 'superadmin', 'c-suite'];

export async function GET(request: NextRequest) {
  const token = extractTokenFromHeader(request.headers.get('authorization'));
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload || !ADMIN_ROLES.includes(payload.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  const oneMonthAgo = new Date(now); oneMonthAgo.setMonth(now.getMonth() - 1);
  const twoMonthsAgo = new Date(now); twoMonthsAgo.setMonth(now.getMonth() - 2);
  const threeMonthsAgo = new Date(now); threeMonthsAgo.setMonth(now.getMonth() - 3);

  // Run all count queries in parallel
  const [totalMsg, totalContacts, olderThan1m, olderThan2m, olderThan3m] = await Promise.all([
    supabaseAdmin.from('whatsapp_messages').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('whatsapp_contacts').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('whatsapp_messages').select('*', { count: 'exact', head: true }).lt('timestamp', oneMonthAgo.toISOString()),
    supabaseAdmin.from('whatsapp_messages').select('*', { count: 'exact', head: true }).lt('timestamp', twoMonthsAgo.toISOString()),
    supabaseAdmin.from('whatsapp_messages').select('*', { count: 'exact', head: true }).lt('timestamp', threeMonthsAgo.toISOString()),
  ]);

  const msgTotal = totalMsg.count || 0;
  const contactTotal = totalContacts.count || 0;

  return NextResponse.json({
    messages: {
      total: msgTotal,
      older_than_1_month: olderThan1m.count || 0,
      older_than_2_months: olderThan2m.count || 0,
      older_than_3_months: olderThan3m.count || 0,
      estimated_size_mb: Math.round(msgTotal * 0.0005 * 10) / 10, // ~500 bytes per msg
    },
    contacts: {
      total: contactTotal,
      estimated_size_mb: Math.round(contactTotal * 0.00025 * 10) / 10,
    },
  });
}

export async function POST(request: NextRequest) {
  const token = extractTokenFromHeader(request.headers.get('authorization'));
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload || !ADMIN_ROLES.includes(payload.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { action, months_to_keep } = body;

  const keepMonths = months_to_keep || 3;
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - keepMonths);

  if (action === 'clean_messages') {
    // Delete messages older than X months
    const { count, error } = await supabaseAdmin
      .from('whatsapp_messages')
      .delete({ count: 'exact' })
      .lt('timestamp', cutoffDate.toISOString());

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      deleted: count || 0,
      message: `${count} mesej lama (sebelum ${cutoffDate.toISOString().split('T')[0]}) telah dipadam`,
    });
  }

  if (action === 'clean_contacts') {
    // Delete contacts that have no messages at all
    // First get all contact JIDs that have messages
    const { data: activeJids } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('remote_jid')
      .gte('timestamp', cutoffDate.toISOString());

    const activeJidSet = new Set((activeJids || []).map((m: any) => m.remote_jid));

    // Get all contacts
    const { data: allContacts } = await supabaseAdmin
      .from('whatsapp_contacts')
      .select('id, jid');

    if (!allContacts) return NextResponse.json({ deleted: 0, message: 'Tiada contacts' });

    // Find orphan contacts (no recent messages)
    const orphanIds = allContacts
      .filter((c: any) => !activeJidSet.has(c.jid))
      .map((c: any) => c.id);

    if (orphanIds.length === 0) {
      return NextResponse.json({ success: true, deleted: 0, message: 'Tiada contacts lama untuk dipadam' });
    }

    // Delete in batches of 500
    let totalDeleted = 0;
    for (let i = 0; i < orphanIds.length; i += 500) {
      const batch = orphanIds.slice(i, i + 500);
      const { count, error } = await supabaseAdmin
        .from('whatsapp_contacts')
        .delete({ count: 'exact' })
        .in('id', batch);

      if (!error) totalDeleted += (count || 0);
    }

    return NextResponse.json({
      success: true,
      deleted: totalDeleted,
      message: `${totalDeleted} contacts lama (tiada mesej sejak ${keepMonths} bulan) telah dipadam`,
    });
  }

  if (action === 'clean_all') {
    // Clean both messages and orphan contacts
    const { count: msgDeleted, error: msgErr } = await supabaseAdmin
      .from('whatsapp_messages')
      .delete({ count: 'exact' })
      .lt('timestamp', cutoffDate.toISOString());

    if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 });

    // Then clean orphan contacts
    const { data: activeJids } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('remote_jid');

    const activeJidSet = new Set((activeJids || []).map((m: any) => m.remote_jid));

    const { data: allContacts } = await supabaseAdmin
      .from('whatsapp_contacts')
      .select('id, jid');

    const orphanIds = (allContacts || [])
      .filter((c: any) => !activeJidSet.has(c.jid))
      .map((c: any) => c.id);

    let contactsDeleted = 0;
    for (let i = 0; i < orphanIds.length; i += 500) {
      const batch = orphanIds.slice(i, i + 500);
      const { count } = await supabaseAdmin
        .from('whatsapp_contacts')
        .delete({ count: 'exact' })
        .in('id', batch);
      contactsDeleted += (count || 0);
    }

    return NextResponse.json({
      success: true,
      messages_deleted: msgDeleted || 0,
      contacts_deleted: contactsDeleted,
      message: `${msgDeleted} mesej dan ${contactsDeleted} contacts lama telah dipadam`,
    });
  }

  return NextResponse.json({ error: 'Action tidak dikenali. Gunakan: clean_messages, clean_contacts, atau clean_all' }, { status: 400 });
}
