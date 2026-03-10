import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MIGRATION_SQL = `-- Tambah kolum yang diperlukan untuk jadual hr_intern_profiles
ALTER TABLE hr_intern_profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE hr_intern_profiles ADD COLUMN IF NOT EXISTS university TEXT;
ALTER TABLE hr_intern_profiles ADD COLUMN IF NOT EXISTS course TEXT;
ALTER TABLE hr_intern_profiles ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE hr_intern_profiles ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE hr_intern_profiles ADD COLUMN IF NOT EXISTS supervisor_id TEXT;
ALTER TABLE hr_intern_profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE hr_intern_profiles ADD COLUMN IF NOT EXISTS evaluation_score INTEGER;
ALTER TABLE hr_intern_profiles ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE hr_intern_profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();`;

export async function POST() {
  try {
    // Check which columns exist
    const { data: testData, error: testError } = await supabase
      .from("hr_intern_profiles")
      .select("*")
      .limit(1);

    const missingColumns: string[] = [];
    if (testError?.message?.includes("column")) {
      const match = testError.message.match(/'([^']+)' column/);
      if (match) missingColumns.push(match[1]);
    }

    return NextResponse.json({
      sql: MIGRATION_SQL,
      message: "Jalankan SQL ini dalam Supabase SQL Editor untuk menambah kolum yang diperlukan.",
      missingColumns
    });
  } catch (error: any) {
    return NextResponse.json({ sql: MIGRATION_SQL, error: error.message });
  }
}
