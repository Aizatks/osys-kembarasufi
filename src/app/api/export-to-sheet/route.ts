import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { google } from "googleapis";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthenticatedStaff() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  
  if (!sessionCookie?.value) {
    return null;
  }
  
  try {
    const session = JSON.parse(sessionCookie.value);
    const supabase = getSupabase();
    const { data: staff } = await supabase
      .from("staff")
      .select("*")
      .eq("id", session.staffId)
      .single();
    
    return staff;
  } catch {
    return null;
  }
}

function getGoogleSheetsAuth() {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY not configured");
  }
  
  const credentials = JSON.parse(serviceAccountKey);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  
  return google.sheets({ version: "v4", auth });
}

export async function POST(request: NextRequest) {
  try {
    const staff = await getAuthenticatedStaff();
    
    if (!staff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    if (staff.role !== "superadmin") {
      return NextResponse.json({ error: "Hanya admin boleh export ke Google Sheet" }, { status: 403 });
    }
    
    const body = await request.json();
    const { report_type, date_from, date_to, staff_id, spreadsheet_id, sheet_name } = body;
    
    if (!spreadsheet_id || !sheet_name) {
      return NextResponse.json({ error: "Spreadsheet ID dan Sheet Name diperlukan" }, { status: 400 });
    }
    
    const supabase = getSupabase();
    const tableName = report_type === "sales" ? "sales_reports" : "lead_reports";
    const dateField = report_type === "sales" ? "date_closed" : "date_lead";
    
    let query = supabase
      .from(tableName)
      .select(`*, staff:staff_id (id, name)`)
      .gte(dateField, date_from)
      .lte(dateField, date_to)
      .order(dateField, { ascending: true });
    
    if (staff_id && staff_id !== "all") {
      query = query.eq("staff_id", staff_id);
    }
    
    const { data: reportData, error: fetchError } = await query;
    
    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    if (!reportData || reportData.length === 0) {
      return NextResponse.json({ error: "Tiada data untuk export" }, { status: 400 });
    }
    
    const sheets = getGoogleSheetsAuth();
    
    let rows: (string | number)[][];
    
    if (report_type === "sales") {
      rows = reportData.map((r) => [
        r.bulan || "",
        r.no_phone || "",
        r.nama_pakej || "",
        r.date_closed || "",
        r.tarikh_trip || "",
        r.jumlah_pax || 0,
        r.harga_pakej || 0,
        r.amount_others || 0,
        r.discount || 0,
        r.total || 0,
        r.paid || 0,
        r.status_bayaran || "",
        r.status_peserta || "",
        r.nama_wakil_peserta || "",
        r.remark || "",
      ]);
    } else {
      rows = reportData.map((r) => [
        r.bulan || "",
        r.nama_pakej || "",
        r.date_lead || "",
        r.no_phone || "",
        r.lead_from || "",
        r.remark || "",
        r.follow_up_status || "",
        r.date_follow_up || "",
      ]);
    }
    
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheet_id,
      range: sheet_name,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: rows,
      },
    });
    
    const updatedCells = response.data.updates?.updatedCells || 0;
    const updatedRows = response.data.updates?.updatedRows || 0;
    
    return NextResponse.json({
      success: true,
      message: `${updatedRows} baris telah ditambah ke Google Sheet`,
      details: {
        updatedCells,
        updatedRows,
        tableRange: response.data.tableRange,
      },
    });
  } catch (error) {
    console.error("Error exporting to Google Sheet:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    if (errorMessage.includes("not configured")) {
      return NextResponse.json({ 
        error: "Google Service Account belum dikonfigurasi. Sila hubungi admin untuk setup." 
      }, { status: 500 });
    }
    
    if (errorMessage.includes("403") || errorMessage.includes("permission")) {
      return NextResponse.json({ 
        error: "Tiada akses ke spreadsheet. Pastikan spreadsheet telah di-share dengan service account email." 
      }, { status: 403 });
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
