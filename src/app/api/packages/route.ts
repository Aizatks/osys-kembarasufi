import { NextResponse } from "next/server";
import { fetchSheetData } from "@/lib/sheets";

export async function GET() {
  try {
    const data = await fetchSheetData();
    const packageNames = Array.from(new Set(Object.values(data).map(p => p.name))).sort();
    
    return NextResponse.json({ data: packageNames });
  } catch (error) {
    console.error("Error fetching packages:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
