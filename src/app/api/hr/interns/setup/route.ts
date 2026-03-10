import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    // Test if table exists
    const { error: testError } = await supabase
      .from("hr_intern_profiles")
      .select("id")
      .limit(1);

    if (!testError) {
      return NextResponse.json({ message: "Jadual sudah wujud" });
    }

    // Table doesn't exist - return SQL for manual creation
    const sql = `
CREATE TABLE IF NOT EXISTS hr_intern_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  university TEXT NOT NULL,
  course TEXT,
  start_date DATE,
  end_date DATE,
  supervisor_id TEXT,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Terminated')),
  evaluation_score INTEGER CHECK (evaluation_score >= 0 AND evaluation_score <= 100),
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
    `.trim();

    return NextResponse.json({
      needsSetup: true,
      sql,
      message: "Jadual belum dibuat. Sila jalankan SQL ini dalam Supabase SQL Editor."
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
