import { NextRequest, NextResponse } from "next/server";
import { fetchSheetData } from "@/lib/sheets";
import { withAuth } from "@/lib/api-auth";

export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const data = await fetchSheetData();
    const packageNames = Array.from(new Set(Object.values(data).map(p => p.name))).sort();
    
    return NextResponse.json({ data: packageNames });
  } catch (error) {
    console.error("Error fetching packages:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
