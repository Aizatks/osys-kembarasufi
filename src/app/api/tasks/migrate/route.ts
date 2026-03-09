import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = extractTokenFromHeader(authHeader);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload || !['admin', 'superadmin'].includes(payload.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Try to select frequency_days — if it fails, we know it doesn't exist
  const { error: checkError } = await supabaseAdmin
    .from('task_templates')
    .select('frequency_days')
    .limit(1);

  if (!checkError) {
    return NextResponse.json({ message: 'Column already exists' });
  }

  // Column doesn't exist — use pg to add it
  const { Client } = await import('pg');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    await client.query('ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS frequency_days integer[] DEFAULT NULL;');
    await client.end();
    return NextResponse.json({ message: 'Migration successful: frequency_days column added' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
