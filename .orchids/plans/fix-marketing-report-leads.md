# Fix Marketing Report - Lead Limit & Package Detection

## Requirements
1. **Lead Count Limit**: Marketing Report API only fetches 1000 leads due to Supabase default limit. Need pagination like lead-reports API.
2. **Package Name Detection**: Need to normalize package names so variations like "TURKI", "TURKEY", "Turkiye" all match to same package.

## Current Issues

### Issue 1: Lead Count Limited to 1000
In `/api/marketing-report/route.ts` line 106-109:
```typescript
let leadsQuery = supabase.from("lead_reports").select("nama_pakej");
// No pagination - Supabase returns max 1000 rows
```

### Issue 2: Exact Package Matching Only
Line 162-166 only does exact string match:
```typescript
leadsData?.forEach((l) => {
  const pkg = l.nama_pakej;
  if (packageStats[pkg]) {  // Exact match only
    packageStats[pkg].leads += 1;
  }
});
```

## Solution

### Phase 1: Add Pagination for Leads Query
Similar to lead-reports API, fetch all leads using pagination:
```typescript
const PAGE_SIZE = 1000;
let allLeadsData: any[] = [];
let page = 0;
let hasMore = true;

while (hasMore) {
  let leadsQuery = supabase
    .from("lead_reports")
    .select("nama_pakej")
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  
  if (dateFrom) leadsQuery = leadsQuery.gte("date_lead", dateFrom);
  if (dateTo) leadsQuery = leadsQuery.lte("date_lead", dateTo);
  
  const { data } = await leadsQuery;
  
  if (data && data.length > 0) {
    allLeadsData = allLeadsData.concat(data);
    page++;
    hasMore = data.length === PAGE_SIZE;
  } else {
    hasMore = false;
  }
}
```

### Phase 2: Add Package Name Normalization
Create a function to normalize package names and find matches:
```typescript
function normalizePackageName(name: string): string {
  if (!name) return "";
  const upper = name.toUpperCase().trim();
  
  // Common mappings
  const mappings: Record<string, string> = {
    "TURKI": "TURKEY",
    "TURKIYE": "TURKEY",
    "MESIR": "EGYPT",
    "JEPUN": "JAPAN",
    "KOREA SELATAN": "KOREA",
    "UK": "UNITED KINGDOM",
    "CEE": "CENTRAL EASTERN EUROPE",
    "SPM": "SPAIN PORTUGAL MOROCCO",
    "BIM": "BEIJING INNER MONGOLIA",
  };
  
  // Check direct mappings
  for (const [short, full] of Object.entries(mappings)) {
    if (upper.includes(short)) {
      return full;
    }
  }
  
  // Extract main destination keyword
  const keywords = ["TURKEY", "JAPAN", "KOREA", "VIETNAM", "CHINA", "EUROPE", 
    "SWITZERLAND", "JORDAN", "EGYPT", "BALKAN", "CAUCASUS", "TAIWAN"];
  
  for (const kw of keywords) {
    if (upper.includes(kw)) return kw;
  }
  
  return upper;
}

function findMatchingPackage(
  leadPkg: string, 
  packageStats: Record<string, any>
): string | null {
  const normalizedLead = normalizePackageName(leadPkg);
  
  for (const pkg of Object.keys(packageStats)) {
    const normalizedPkg = normalizePackageName(pkg);
    if (normalizedLead === normalizedPkg || 
        normalizedLead.includes(normalizedPkg) || 
        normalizedPkg.includes(normalizedLead)) {
      return pkg;
    }
  }
  return null;
}
```

### Phase 3: Update Lead Counting Logic
```typescript
// Group Leads by Package (with fuzzy matching)
allLeadsData?.forEach((l) => {
  const leadPkg = l.nama_pakej;
  
  // Try exact match first
  if (packageStats[leadPkg]) {
    packageStats[leadPkg].leads += 1;
    return;
  }
  
  // Try fuzzy match
  const matchedPkg = findMatchingPackage(leadPkg, packageStats);
  if (matchedPkg) {
    packageStats[matchedPkg].leads += 1;
  }
});
```

## Files to Modify
1. `src/app/api/marketing-report/route.ts` - Add pagination and package normalization

## Testing
1. Import > 1000 leads
2. Check Marketing Report shows correct total (should be > 1000)
3. Add spending for "TURKEY 10 HARI"
4. Add leads with "TURKI", "Turkiye", "Turkey" variations
5. Verify all leads count towards the same package
