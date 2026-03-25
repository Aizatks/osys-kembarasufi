import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyToken, extractTokenFromHeader } from "@/lib/auth";
import { cleanPhoneNumber } from "@/lib/phone-utils";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    // Auth check - superadmin only
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabase();
    const { data: staff } = await supabase
      .from("staff")
      .select("role")
      .eq("id", payload.impersonatedBy || payload.userId)
      .single();

    if (!staff || staff.role !== "superadmin") {
      return NextResponse.json({ error: "Superadmin sahaja boleh scan duplicates" }, { status: 403 });
    }

    // Parse optional date range from request body
    let dateFrom: string | null = null;
    let dateTo: string | null = null;
    try {
      const body = await request.json();
      dateFrom = body.date_from || null;
      dateTo = body.date_to || null;
    } catch {
      // No body or invalid JSON — scan all records
    }

    // Fetch lead reports, ordered by date_lead ASC, created_at ASC
    // If date range provided, only scan within that range
    const PAGE_SIZE = 1000;
    let allRecords: { id: string; no_phone: string | null; is_duplicate: boolean }[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from("lead_reports")
        .select("id, no_phone, is_duplicate")
        .order("date_lead", { ascending: true })
        .order("created_at", { ascending: true });

      if (dateFrom) {
        query = query.gte("date_lead", dateFrom);
      }
      if (dateTo) {
        query = query.lte("date_lead", dateTo);
      }

      const { data, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      allRecords = allRecords.concat(data);
      page++;
      hasMore = data.length === PAGE_SIZE;
    }

    // Build phone-seen map: first occurrence = original, rest = duplicate
    const seenPhones = new Set<string>();
    const idsToMarkDuplicate: string[] = [];
    const idsToUnmarkDuplicate: string[] = [];
    let phonesNormalized = 0;

    for (const record of allRecords) {
      const cleaned = cleanPhoneNumber(record.no_phone);

      if (!cleaned) {
        // No valid phone — should not be duplicate
        if (record.is_duplicate) {
          idsToUnmarkDuplicate.push(record.id);
        }
        continue;
      }

      if (seenPhones.has(cleaned)) {
        // This is a duplicate
        if (!record.is_duplicate) {
          idsToMarkDuplicate.push(record.id);
        }
      } else {
        // First occurrence — original
        seenPhones.add(cleaned);
        if (record.is_duplicate) {
          idsToUnmarkDuplicate.push(record.id);
        }
      }

      // Normalize stored phone number if different
      if (record.no_phone && record.no_phone !== cleaned) {
        phonesNormalized++;
      }
    }

    // Batch update: mark duplicates
    const BATCH_SIZE = 200;
    let updatedDuplicates = 0;
    let updatedOriginals = 0;

    for (let i = 0; i < idsToMarkDuplicate.length; i += BATCH_SIZE) {
      const batch = idsToMarkDuplicate.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from("lead_reports")
        .update({ is_duplicate: true })
        .in("id", batch);
      if (!error) updatedDuplicates += batch.length;
    }

    // Batch update: unmark false duplicates
    for (let i = 0; i < idsToUnmarkDuplicate.length; i += BATCH_SIZE) {
      const batch = idsToUnmarkDuplicate.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from("lead_reports")
        .update({ is_duplicate: false })
        .in("id", batch);
      if (!error) updatedOriginals += batch.length;
    }

    // Normalize phone numbers that aren't cleaned yet (within date range if specified)
    let normalizedCount = 0;
    page = 0;
    hasMore = true;

    while (hasMore) {
      let normQuery = supabase
        .from("lead_reports")
        .select("id, no_phone")
        .not("no_phone", "is", null);

      if (dateFrom) {
        normQuery = normQuery.gte("date_lead", dateFrom);
      }
      if (dateTo) {
        normQuery = normQuery.lte("date_lead", dateTo);
      }

      const { data, error } = await normQuery.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error || !data || data.length === 0) {
        hasMore = false;
        break;
      }

      const updates: { id: string; no_phone: string }[] = [];
      for (const record of data) {
        if (record.no_phone) {
          const cleaned = cleanPhoneNumber(record.no_phone);
          if (cleaned && cleaned !== record.no_phone) {
            updates.push({ id: record.id, no_phone: cleaned });
          }
        }
      }

      // Update in batches
      for (const upd of updates) {
        await supabase
          .from("lead_reports")
          .update({ no_phone: upd.no_phone })
          .eq("id", upd.id);
        normalizedCount++;
      }

      page++;
      hasMore = data.length === PAGE_SIZE;
    }

    return NextResponse.json({
      success: true,
      totalRecords: allRecords.length,
      duplicatesFound: idsToMarkDuplicate.length,
      duplicatesMarked: updatedDuplicates,
      falsePositivesFixed: updatedOriginals,
      phonesNormalized: normalizedCount,
      message: `Scan selesai: ${idsToMarkDuplicate.length} duplicate ditemui daripada ${allRecords.length} rekod. ${updatedOriginals} false positive diperbetulkan. ${normalizedCount} nombor dinormalisasi.`,
    });
  } catch (error) {
    console.error("Scan duplicates error:", error);
    return NextResponse.json({ error: "Scan gagal: " + (error as Error).message }, { status: 500 });
  }
}
