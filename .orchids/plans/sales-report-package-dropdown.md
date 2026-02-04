# Sales Report Package Dropdown Fix

## Requirements
User reports that sales team enters package names manually with shortforms and variations (e.g., "SWZ", "TURKI", "JORDAN AQSA 9D"). This causes mismatch with Marketing Report because:
1. Sales Report `nama_pakej` is a free-text field
2. Marketing Report tries to match against `marketing_spending.nama_pakej` and `lead_reports.nama_pakej`
3. Different naming conventions = data doesn't tally

## Current Architecture

### Tables Involved:
- `sales_reports` - has `nama_pakej` (text field - manually typed)
- `marketing_spending` - has `nama_pakej` (text field)
- `lead_reports` - has `nama_pakej` (text field)

### Package Source:
- `/api/packages` fetches from Google Sheets (`lib/sheets.ts`)
- Returns standardized package names like:
  - "WEST EUROPE 13 HARI 10 MALAM"
  - "TURKEY 10 HARI 7 MALAM"
  - "JORDAN AQSA 9 HARI 6 MALAM"

### Current Problem:
In `SalesReportTab.tsx` line 850, the form uses a plain `<Input>` for `nama_pakej`:
```tsx
<div className="space-y-2">
  <Label>Nama Pakej</Label>
  <Input value={formData.nama_pakej} onChange={(e) => setFormData({...formData, nama_pakej: e.target.value})} />
</div>
```

## Solution

### Phase 1: Create Package Dropdown Component
Create a searchable dropdown (combobox) that:
1. Fetches package list from `/api/packages`
2. Allows searching/filtering packages
3. Shows standardized package names
4. Optionally allows custom input for edge cases

### Phase 2: Update SalesReportTab.tsx
Replace the `<Input>` for `nama_pakej` with the new dropdown:
1. In "Tambah Sales" dialog
2. In "Edit Sales" dialog
3. In "Bulk Edit" when selecting `nama_pakej` field

### Phase 3: Update Related Components
Apply same fix to:
1. `MarketingSpendingForm.tsx` - for consistency in spending records
2. `LeadReportTab.tsx` - for lead entry (if has similar issue)

### Phase 4: Data Normalization API (Optional)
Create utility to normalize existing data:
- Map common shortforms to standard names
- Provide migration script for existing records

## Implementation Details

### Package Dropdown Component
```tsx
// src/components/ui/package-select.tsx
interface PackageSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function PackageSelect({ value, onChange, placeholder }: PackageSelectProps) {
  const [packages, setPackages] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  useEffect(() => {
    fetch("/api/packages")
      .then(res => res.json())
      .then(data => setPackages(data.data || []));
  }, []);
  
  const filtered = packages.filter(p => 
    p.toLowerCase().includes(search.toLowerCase())
  );
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          {value || placeholder || "Pilih pakej..."}
          <ChevronsUpDown className="ml-2 h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Cari pakej..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>Tiada pakej dijumpai</CommandEmpty>
            <CommandGroup>
              {filtered.map(pkg => (
                <CommandItem key={pkg} onSelect={() => { onChange(pkg); setOpen(false); }}>
                  {pkg}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

### SalesReportTab.tsx Changes
```tsx
// Replace Input with PackageSelect
<div className="space-y-2">
  <Label>Nama Pakej</Label>
  <PackageSelect 
    value={formData.nama_pakej} 
    onChange={(v) => setFormData({...formData, nama_pakej: v})} 
  />
</div>
```

## Common Shortform Mappings (for reference)
| Shortform | Standard Name |
|-----------|---------------|
| SWZ | SWITZERLAND |
| TURKI | TURKEY |
| UK | UNITED KINGDOM |
| CEE | CENTRAL EASTERN EUROPE |
| SPM | SPAIN PORTUGAL MOROCCO |
| BIM | BEIJING INNER MONGOLIA |
| MESIR | EGYPT / MESIR JEJAK RASUL |

## Files to Modify
1. **NEW**: `src/components/ui/package-select.tsx` - Reusable package dropdown
2. `src/components/SalesReportTab.tsx` - Replace nama_pakej Input with PackageSelect
3. `src/components/dashboard/MarketingSpendingForm.tsx` - Apply same dropdown
4. `src/components/LeadReportTab.tsx` - Apply same dropdown (if applicable)

## Testing
1. Add new sales record - verify dropdown shows all packages
2. Search for "TURKEY" - verify filtering works
3. Check Marketing Report - verify pax/leads now match spending data
4. Edit existing record - verify dropdown pre-selects correct package

## Benefits
1. **Data Consistency**: All reports use identical package names
2. **No Typos**: Dropdown prevents spelling mistakes
3. **Better Matching**: Marketing Report can accurately aggregate data
4. **User Friendly**: Searchable dropdown faster than typing
