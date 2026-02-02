import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import * as XLSX from "xlsx";
import { verifyToken, extractTokenFromHeader } from "@/lib/auth";
import * as cheerio from "cheerio";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getAuthenticatedStaff(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  
  if (sessionCookie?.value) {
    try {
      const session = JSON.parse(sessionCookie.value);
      const { data: staff } = await supabase
        .from("staff")
        .select("*")
        .eq("id", session.staffId)
        .single();
      if (staff) return staff;
    } catch {}
  }

  const authHeader = request.headers.get("authorization");
  const token = extractTokenFromHeader(authHeader);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded?.userId) {
      const { data: staff } = await supabase
        .from("staff")
        .select("*")
        .eq("id", decoded.userId)
        .single();
      if (staff) return staff;
    }
  }
  
  return null;
}

function parseDate(val: any): string | null {
  if (!val) return null;
  
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  
  const str = String(val).trim();
  if (!str || str === '-' || str.toLowerCase() === 'nan') return null;

  const parts = str.split(/[\/\-\.]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }

  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch {}

  return null;
}

function cleanCurrency(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  
  if (typeof val === 'object' && val !== null) {
    if (val.v !== undefined && val.v !== null) {
      if (typeof val.v === 'number') return val.v;
      return cleanCurrency(val.v);
    }
    if (val.f) return cleanCurrency(val.f);
    return 0;
  }
  
  const str = String(val).replace(/[^0-9.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function cleanPhoneNumber(phone: string | null): string | null {
  if (!phone) return null;
  let cleaned = String(phone).replace(/[^0-9]/g, '');
  if (cleaned.length < 8) return null;
  if (cleaned.startsWith('0')) {
    cleaned = '60' + cleaned.slice(1);
  }
  return cleaned;
}

function checkDuplicateInBatch(phone: string | null, batchPhones: Set<string>): boolean {
  if (!phone) return false;
  const cleanPhone = cleanPhoneNumber(phone);
  if (!cleanPhone || cleanPhone.length < 8) return false;
  return batchPhones.has(cleanPhone);
}

async function fetchGoogleSheetAsCSV(sheetId: string, gid: string): Promise<any[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Gagal ambil data dari Google Sheets");
  const text = await response.text();
  
  const rows: any[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell);
        currentCell = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentCell);
        if (currentRow.some(c => c.trim())) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
        if (char === '\r') i++;
      } else if (char !== '\r') {
        currentCell += char;
      }
    }
  }
  
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell);
    if (currentRow.some(c => c.trim())) {
      rows.push(currentRow);
    }
  }
  
  return rows;
}

function parseHtmlTable(html: string): any[][] {
  const $ = cheerio.load(html);
  const rows: any[][] = [];
  
  const table = $('table').first();
  
  const headers: string[] = [];
  table.find('thead tr th, thead tr td, tr:first-child th, tr:first-child td').each((_, el) => {
    headers.push($(el).text().trim());
  });
  
  if (headers.length > 0) {
    rows.push(headers);
  }
  
  table.find('tbody tr, tr').each((idx, tr) => {
    if (idx === 0 && headers.length > 0 && !table.find('thead').length) return;
    
    const row: any[] = [];
    $(tr).find('td, th').each((_, td) => {
      row.push($(td).text().trim());
    });
    
    if (row.length > 0) {
      rows.push(row);
    }
  });
  
  return rows;
}

async function parsePdfToRows(buffer: Buffer): Promise<any[][]> {
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  const lines = data.text.split('\n').filter((line: string) => line.trim());
  
  const rows: any[][] = [];
  rows.push(['BULAN', 'PAKEJ', 'DATE', 'NO PHONE', 'LEAD FROM', 'REMARK', 'FOLLOW UP']);
  
  const leadPattern = /^(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE?|JULY|AUGUST|SEPTEMBER|OKTOBER?|NOVEMBER|DECEMBER|JANUARI|FEBRUARI|MARET?|APRIL|MEI|JUNI|JULI|AGUSTUS|SEPTEMBER|OKTOBER|NOVEMBER|DESEMBER)\s+(.+?)\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+([\d\s\-]+?)\s+(ADS|PS|HAIKAL|CG LOH|CG|ORGANIC|WA|WHATSAPP|IG|INSTAGRAM|FB|FACEBOOK|TIKTOK|REFERRAL|WALK IN|WALKIN)\s*(.*?)$/i;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (!trimmed || trimmed === 'JANUARY' || trimmed.startsWith('COUNTA') || trimmed.startsWith('Grand Total') || trimmed.startsWith('Date ')) {
      continue;
    }
    
    const match = trimmed.match(leadPattern);
    if (match) {
      const bulan = match[1].toUpperCase();
      const pakej = match[2].trim();
      const date = match[3];
      const rawPhone = match[4];
      const phone = rawPhone.replace(/[\s\-]/g, '');
      const leadFrom = match[5].toUpperCase();
      const remark = match[6]?.trim() || '';
      
      rows.push([bulan, pakej, date, phone, leadFrom, remark, '']);
    } else {
      const cells = trimmed.split(/\s{2,}|\t/).map((c: string) => c.trim()).filter((c: string) => c);
      
      if (cells.length >= 4 && /^(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE?|JULY|AUGUST|SEPTEMBER|OKTOBER?|NOVEMBER|DECEMBER)/i.test(cells[0])) {
        const phoneIdx = cells.findIndex(c => /^\d[\d\s\-]{8,}$/.test(c));
        if (phoneIdx > 0) {
          const phone = cells[phoneIdx].replace(/[\s\-]/g, '');
          rows.push([cells[0], cells[1] || '', cells[2] || '', phone, cells[phoneIdx + 1] || '', cells[phoneIdx + 2] || '', '']);
        } else {
          rows.push(cells);
        }
      }
    }
  }
  
  return rows;
}

export async function POST(request: NextRequest) {
  try {
    const staff = await getAuthenticatedStaff(request);

    if (!staff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const files = formData.getAll('files') as File[];
        const singleFile = formData.get('file') as File | null;
        let staffId = formData.get('staffId') as string;
        const type = formData.get('type') as string;
        
        if (staff.role !== "superadmin") {
          staffId = staff.id;
        }
        
        const allFiles = files.length > 0 ? files : (singleFile ? [singleFile] : []);
        
        if (allFiles.length === 0 || !staffId) {
          return NextResponse.json({ error: "File and Staff ID required" }, { status: 400 });
        }
        
        let allRows: any[][] = [];
        let successfulFormats: string[] = [];
        let failedFormats: string[] = [];
        
        for (const file of allFiles) {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const fileName = file.name.toLowerCase();
          
          try {
            let rows: any[][] = [];
            
            if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
              const htmlContent = buffer.toString('utf-8');
              rows = parseHtmlTable(htmlContent);
              if (rows.length > 1) successfulFormats.push(`HTML (${file.name})`);
            } else if (fileName.endsWith('.pdf')) {
              rows = await parsePdfToRows(buffer);
              if (rows.length > 1) successfulFormats.push(`PDF (${file.name})`);
            } else if (fileName.endsWith('.csv')) {
              const workbook = XLSX.read(arrayBuffer, { type: 'array' });
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
              if (rows.length > 1) successfulFormats.push(`CSV (${file.name})`);
            } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
              const workbook = XLSX.read(arrayBuffer);
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
              if (rows.length > 1) successfulFormats.push(`Excel (${file.name})`);
            }
            
            if (rows.length > 1) {
              if (allRows.length === 0) {
                allRows = rows;
              } else {
                allRows = [...allRows, ...rows.slice(1)];
              }
            } else {
              failedFormats.push(file.name);
            }
          } catch (e) {
            console.error(`Failed to parse ${file.name}:`, e);
            failedFormats.push(file.name);
          }
        }
        
        if (allRows.length < 2) {
          return NextResponse.json({ 
            error: `Tiada data boleh dibaca dari fail yang diupload. ${failedFormats.length > 0 ? `Gagal baca: ${failedFormats.join(', ')}` : ''}` 
          }, { status: 400 });
        }
      
        const headers = allRows[0].map(h => String(h || '').toLowerCase().trim());
        const results = { 
          salesImported: 0, 
          leadsImported: 0, 
          duplicatesMarked: 0, 
          skippedEmpty: 0, 
          errors: [] as string[],
          filesRead: successfulFormats,
          filesFailed: failedFormats
        };
        
        const currentBatchPhones = new Set<string>();
        const filterMonth = formData.get('filterMonth') as string | null;
        
        if (type === 'sales') {
        for (let i = 1; i < allRows.length; i++) {
          const row = allRows[i];
          if (!row || row.length === 0 || row.every(cell => !cell)) continue;
          
          const getValue = (colNames: string[]) => {
            for (const name of colNames) {
              const idx = headers.findIndex(h => h.includes(name));
              if (idx !== -1 && row[idx] !== undefined && row[idx] !== null) return row[idx];
            }
            return null;
          };
          
          const bulan = getValue(['bulan', 'month']) || 'JANUARY';
          const noPhone = getValue(['phone', 'telefon', 'no_phone', 'no phone']);
          const namaPakej = getValue(['pakej', 'package', 'nama_pakej', 'nama pakej']);
          const dateClosed = getValue(['date_closed', 'date closed', 'tarikh close', 'closed']);
          const tarikhTrip = getValue(['tarikh_trip', 'tarikh trip', 'trip date']);
          const jumlahPax = getValue(['pax', 'jumlah_pax', 'jumlah pax', 'bil pax']);
          const hargaPakej = getValue(['harga', 'harga_pakej', 'harga pakej', 'price']);
          const amountOthers = getValue(['others', 'amount_others', 'amount others']);
          const discount = getValue(['discount', 'diskaun']);
          const total = getValue(['total', 'jumlah']);
          const paid = getValue(['paid', 'bayar', 'dibayar']);
          const statusBayaran = getValue(['status_bayaran', 'status bayaran', 'payment status', 'bayaran']);
          const statusPeserta = getValue(['status_peserta', 'status peserta', 'customer status']);
          const namaWakil = getValue(['wakil', 'nama_wakil', 'nama wakil peserta']);
          const remark = getValue(['remark', 'catatan', 'nota']);
          
          if (!namaPakej) continue;
          
          const { error } = await supabase.from("sales_reports").insert({
            staff_id: staffId,
            bulan: String(bulan).toUpperCase(),
            no_phone: noPhone ? String(noPhone) : null,
            nama_pakej: String(namaPakej),
            date_closed: parseDate(dateClosed),
            tarikh_trip: tarikhTrip ? String(tarikhTrip) : null,
            jumlah_pax: parseInt(String(jumlahPax || '0')) || 0,
            harga_pakej: cleanCurrency(hargaPakej),
            amount_others: cleanCurrency(amountOthers),
            discount: cleanCurrency(discount),
            total: cleanCurrency(total),
            paid: cleanCurrency(paid),
            status_bayaran: statusBayaran ? String(statusBayaran) : null,
            status_peserta: statusPeserta ? String(statusPeserta) : null,
            nama_wakil_peserta: namaWakil ? String(namaWakil) : null,
            remark: remark ? String(remark) : null,
            report_date: new Date().toISOString().split('T')[0],
          });
          
          if (error) {
            results.errors.push(`Sales Baris ${i}: ${error.message}`);
          } else {
            results.salesImported++;
          }
        }
        } else if (type === 'leads') {
          for (let i = 1; i < allRows.length; i++) {
            const row = allRows[i];
            if (!row || row.length === 0 || row.every(cell => !cell)) continue;
            
            const getValue = (colNames: string[], defaultIdx?: number) => {
              for (const name of colNames) {
                const idx = headers.findIndex(h => h.includes(name));
                if (idx !== -1 && row[idx] !== undefined && row[idx] !== null && String(row[idx]).trim() !== '') return row[idx];
              }
              if (defaultIdx !== undefined && row[defaultIdx] !== undefined && row[defaultIdx] !== null) {
                return row[defaultIdx];
              }
              return null;
            };
            
            const bulan = getValue(['bulan', 'month'], 0) || 'JANUARY';
            const namaPakej = getValue(['pakej', 'package', 'nama_pakej', 'nama pakej'], 2);
            const dateLead = getValue(['date_lead', 'date lead', 'tarikh lead', 'lead date', 'date', 'tarikh'], 3);
            const noPhone = getValue(['phone', 'telefon', 'no_phone', 'no phone', 'hp', 'handphone', 'mobile', 'no. phone', 'no.phone'], 4);
            const leadFrom = getValue(['lead_from', 'lead from', 'sumber', 'platform', 'from'], 5);
            const remark = getValue(['remark', 'catatan', 'nota', 'notes'], 6);
            const followUpStatus = getValue(['follow_up', 'follow up', 'status', 'fu'], 7);
            const dateFollowUp = getValue(['date_follow_up', 'date follow up', 'date fu', 'tarikh fu'], 8);
            
            if (!namaPakej || String(namaPakej).trim() === '') {
              results.skippedEmpty++;
              continue;
            }
            
            if (filterMonth) {
              const rowBulan = String(bulan).toUpperCase();
              if (!rowBulan.includes(filterMonth.toUpperCase())) {
                continue;
              }
            }
          
            const cleanedPhone = cleanPhoneNumber(noPhone ? String(noPhone) : null);
            const isDuplicate = checkDuplicateInBatch(noPhone ? String(noPhone) : null, currentBatchPhones);
            if (cleanedPhone) currentBatchPhones.add(cleanedPhone);
            
            const { error } = await supabase.from("lead_reports").insert({
              staff_id: staffId,
              bulan: String(bulan).toUpperCase(),
              nama_pakej: String(namaPakej),
              date_lead: parseDate(dateLead),
              no_phone: cleanedPhone || (noPhone ? String(noPhone) : null),
              lead_from: leadFrom ? String(leadFrom) : null,
              remark: remark ? String(remark) : null,
              follow_up_status: followUpStatus ? String(followUpStatus) : null,
              date_follow_up: parseDate(dateFollowUp),
              is_duplicate: isDuplicate,
              report_date: new Date().toISOString().split('T')[0],
            });
          
          if (error) {
            results.errors.push(`Lead Baris ${i}: ${error.message}`);
          } else {
            results.leadsImported++;
            if (isDuplicate) results.duplicatesMarked++;
          }
          }
        }
        
        let successMsg = `Berjaya import ${results.salesImported} sales, ${results.leadsImported} leads`;
        if (results.duplicatesMarked > 0) successMsg += ` (${results.duplicatesMarked} duplicate)`;
        if (results.skippedEmpty > 0) successMsg += ` (${results.skippedEmpty} row kosong diabaikan)`;
        if (successfulFormats.length > 0) successMsg += `. Dibaca dari: ${successfulFormats.join(', ')}`;
        if (failedFormats.length > 0) successMsg += `. Gagal baca: ${failedFormats.join(', ')}`;
        
        return NextResponse.json({ 
          success: true, 
          message: successMsg,
          ...results 
        });
      }
      
      // Google Sheets Import
      const body = await request.json();
      let { type, staffId, sheetId, salesGid, leadGid, filterMonth } = body;
    
    if (staff.role !== "superadmin") {
      staffId = staff.id;
    }
    
    if (!staffId) {
      return NextResponse.json({ error: "Staff ID required" }, { status: 400 });
    }
    
      const SHEET_ID = sheetId || '1C0jdJxjkdwTULNMPqgqbXyOctnOfkrVM_K_u1ywM4Hs';
      const SALES_GID = salesGid || '1789979154';
      const LEAD_GID = leadGid || '1892509228';
      
      const results = { salesImported: 0, leadsImported: 0, duplicatesMarked: 0, skippedEmpty: 0, errors: [] as string[] };
    
    if (type === 'sales' || type === 'all') {
      try {
        const rows = await fetchGoogleSheetAsCSV(SHEET_ID, SALES_GID);
        if (rows.length < 2) throw new Error("Tiada data dalam sheet sales");
        
        const headers = rows[0].map((h: any) => String(h || '').toLowerCase().trim());
        
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0 || row.every((cell: any) => !cell || !String(cell).trim())) continue;
            
            const getValue = (colKeywords: string[], defaultIndex: number) => {
              const idx = headers.findIndex((h: string) => colKeywords.some(kw => h.includes(kw)));
              const cellIdx = idx !== -1 ? idx : defaultIndex;
              const val = row[cellIdx];
              if (val === undefined || val === null || String(val).trim() === '') return null;
              return val;
            };

            const bulan = getValue(['bulan', 'month'], 0);
            const noPhone = getValue(['phone', 'telefon', 'no_phone', 'no phone'], 2);
            const namaPakej = getValue(['pakej', 'package', 'nama_pakej', 'nama pakej'], 3);
            const dateClosed = getValue(['date_closed', 'date closed', 'tarikh close', 'closed', 'date'], 4);
            const tarikhTrip = getValue(['tarikh_trip', 'tarikh trip', 'trip date'], 5);
            const jumlahPax = getValue(['jumlah daftar', 'pax', 'jumlah_pax', 'jumlah pax', 'bil pax'], 6);
            const hargaPakej = getValue(['harga pakej', 'harga_pakej', 'harga', 'price'], 7);
            const amountOthers = getValue(['amount others', 'others', 'amount_others'], 8);
            const discount = getValue(['discount', 'diskaun'], 9);
            const total = getValue(['total'], 10);
            const paid = getValue(['paid', 'bayar', 'dibayar'], 11);
            const statusBayaran = getValue(['status_bayaran', 'status bayaran', 'payment status', 'bayaran'], 12);
            const statusPeserta = getValue(['status_peserta', 'status peserta'], 13);
            const namaWakil = getValue(['wakil', 'nama_wakil'], 14);
            const remark = getValue(['remark', 'catatan', 'nota'], 15);
            
            if (!bulan || !namaPakej) continue;
            if (String(bulan).toLowerCase() === 'bulan' || String(namaPakej).toLowerCase() === 'nama pakej') continue;
          
          const { error } = await supabase.from("sales_reports").insert({
            staff_id: staffId,
            bulan: String(bulan).toUpperCase(),
            no_phone: noPhone ? cleanPhoneNumber(String(noPhone)) || String(noPhone) : null,
            nama_pakej: String(namaPakej),
            date_closed: parseDate(dateClosed),
            tarikh_trip: tarikhTrip ? String(tarikhTrip) : null,
            jumlah_pax: parseInt(String(jumlahPax)) || 0,
            harga_pakej: cleanCurrency(hargaPakej),
            amount_others: cleanCurrency(amountOthers),
            discount: cleanCurrency(discount),
            total: cleanCurrency(total),
            paid: cleanCurrency(paid),
            status_bayaran: statusBayaran ? String(statusBayaran) : null,
            status_peserta: statusPeserta ? String(statusPeserta) : null,
            nama_wakil_peserta: namaWakil ? String(namaWakil) : null,
            remark: remark ? String(remark) : null,
            report_date: new Date().toISOString().split('T')[0],
          });
          
          if (error) {
            results.errors.push(`Sales row ${i}: ${error.message}`);
          } else {
            results.salesImported++;
          }
        }
      } catch (e) {
        results.errors.push(`Sales fetch error: ${(e as Error).message}`);
      }
    }
    
    if (type === 'leads' || type === 'all') {
        try {
          const rows = await fetchGoogleSheetAsCSV(SHEET_ID, LEAD_GID);
          if (rows.length < 2) throw new Error("Tiada data dalam sheet leads");
          
          const headers = rows[0].map((h: any) => String(h || '').toLowerCase().trim());
          
          const googleSheetBatchPhones = new Set<string>();
          
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0 || row.every((cell: any) => !cell || !String(cell).trim())) continue;
            
            const getValue = (colKeywords: string[], defaultIndex: number) => {
              const idx = headers.findIndex((h: string) => colKeywords.some(kw => h.includes(kw)));
              const cellIdx = idx !== -1 ? idx : defaultIndex;
              const val = row[cellIdx];
              if (val === undefined || val === null || String(val).trim() === '') return null;
              return val;
            };

            const bulan = getValue(['bulan', 'month'], 0);
            const namaPakej = getValue(['pakej', 'package', 'nama_pakej', 'nama pakej'], 2);
            const dateLead = getValue(['date_lead', 'date lead', 'tarikh lead', 'lead date', 'date'], 3);
            const noPhone = getValue(['phone', 'telefon', 'no_phone', 'no phone', 'no. phone', 'hp', 'handphone'], 4);
            const leadFrom = getValue(['lead_from', 'lead from', 'sumber', 'platform'], 5);
            const remark = getValue(['remark', 'catatan', 'nota'], 6);
            const followUpStatus = getValue(['follow_up', 'follow up', 'status'], 7);
            const dateFollowUp = getValue(['date_follow_up', 'date follow up'], 8);
            
            if (!bulan || !namaPakej) continue;
            if (String(bulan).toLowerCase() === 'bulan' || String(namaPakej).toLowerCase() === 'nama pakej') continue;
            
            const cleanedPhone = cleanPhoneNumber(noPhone ? String(noPhone) : null);
            const isDuplicate = checkDuplicateInBatch(noPhone ? String(noPhone) : null, googleSheetBatchPhones);
            if (cleanedPhone) googleSheetBatchPhones.add(cleanedPhone);
            
            const { error } = await supabase.from("lead_reports").insert({
              staff_id: staffId,
              bulan: String(bulan).toUpperCase(),
              nama_pakej: String(namaPakej),
              date_lead: parseDate(dateLead),
              no_phone: cleanedPhone || (noPhone ? String(noPhone) : null),
              lead_from: leadFrom ? String(leadFrom) : null,
              remark: remark ? String(remark) : null,
              follow_up_status: followUpStatus ? String(followUpStatus) : null,
              date_follow_up: parseDate(dateFollowUp),
              is_duplicate: isDuplicate,
              report_date: new Date().toISOString().split('T')[0],
            });
            
            if (error) {
              results.errors.push(`Lead row ${i}: ${error.message}`);
            } else {
              results.leadsImported++;
              if (isDuplicate) results.duplicatesMarked++;
            }
          }
        } catch (e) {
          results.errors.push(`Lead fetch error: ${(e as Error).message}`);
        }
      }
    
    return NextResponse.json({ 
      success: true, 
      message: `Berjaya import ${results.salesImported} sales, ${results.leadsImported} leads${results.duplicatesMarked > 0 ? ` (${results.duplicatesMarked} duplicate)` : ''}`,
      ...results 
    });
    
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "Import gagal: " + (error as Error).message }, { status: 500 });
  }
}
