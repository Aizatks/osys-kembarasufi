import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyToken, extractTokenFromHeader, isAdminRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
  // Admin-only protection
  const token = extractTokenFromHeader(request.headers.get('authorization'));
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const payload = verifyToken(token);
  if (!payload || !isAdminRole(payload.role)) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check if column exists
  const { error: checkError } = await supabase
    .from("sales_reports")
    .select("lead_from")
    .limit(1);

  if (!checkError) {
    return NextResponse.json({ status: "OK", message: "Column lead_from already exists" });
  }

  // Column missing - try to add via SQL function
  const { error: sqlError } = await supabase.rpc("exec_ddl", {
    ddl: "ALTER TABLE sales_reports ADD COLUMN IF NOT EXISTS lead_from TEXT"
  });

  if (sqlError) {
    // Return the SQL for manual execution
    return NextResponse.json({
      status: "MANUAL_REQUIRED",
      sql: "ALTER TABLE sales_reports ADD COLUMN IF NOT EXISTS lead_from TEXT;",
      error: sqlError.message
    }, { status: 200 });
  }

  return NextResponse.json({ status: "MIGRATED", message: "Column lead_from added successfully" });
}
