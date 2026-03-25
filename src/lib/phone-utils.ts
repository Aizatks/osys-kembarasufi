import { SupabaseClient } from "@supabase/supabase-js";

export function cleanPhoneNumber(phone: string | null): string | null {
  if (!phone) return null;
  let cleaned = String(phone).replace(/[^0-9]/g, '');
  if (cleaned.length < 8) return null;
  if (cleaned.startsWith('0')) {
    cleaned = '60' + cleaned.slice(1);
  }
  return cleaned;
}

export function checkDuplicateInBatch(phone: string | null, batchPhones: Set<string>): boolean {
  if (!phone) return false;
  const cleanPhone = cleanPhoneNumber(phone);
  if (!cleanPhone || cleanPhone.length < 8) return false;
  return batchPhones.has(cleanPhone);
}

/**
 * Fetch all existing phone numbers from lead_reports into a Set (for bulk import).
 * Uses pagination to bypass Supabase 1000-row limit.
 */
export async function fetchExistingPhones(supabase: SupabaseClient): Promise<Set<string>> {
  const phones = new Set<string>();
  const PAGE_SIZE = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("lead_reports")
      .select("no_phone")
      .not("no_phone", "is", null)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error || !data || data.length === 0) {
      hasMore = false;
      break;
    }

    for (const row of data) {
      if (row.no_phone) {
        const cleaned = cleanPhoneNumber(row.no_phone);
        if (cleaned) phones.add(cleaned);
      }
    }

    page++;
    hasMore = data.length === PAGE_SIZE;
  }

  return phones;
}

/**
 * Check if a single phone number exists in the DB.
 * excludeId: skip a specific record (for edit/update scenarios).
 */
export async function checkPhoneExistsInDB(
  supabase: SupabaseClient,
  phone: string | null,
  excludeId?: string
): Promise<boolean> {
  if (!phone) return false;
  const cleaned = cleanPhoneNumber(phone);
  if (!cleaned) return false;

  let query = supabase
    .from("lead_reports")
    .select("id")
    .eq("no_phone", cleaned)
    .limit(1);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data } = await query;
  return !!(data && data.length > 0);
}
