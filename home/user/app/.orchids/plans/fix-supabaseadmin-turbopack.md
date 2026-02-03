# Fix supabaseAdmin Turbopack Cache Issue

## Problem
Error: `Export supabaseAdmin doesn't exist in target module`

Tapi file `src/lib/supabase.ts` **SUDAH ADA** export `supabaseAdmin` (line 11-13):
```typescript
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : supabase;
```

**Ini adalah Turbopack cache issue** - bukan code issue.

## Root Cause
Turbopack dalam Next.js 15 dengan dev mode kadang-kadang tak detect file changes dengan betul, terutama selepas:
- Multiple rapid file changes
- Server crash/restart
- Zombie processes yang tak clear

## Files Affected
7 files import `supabaseAdmin`:
1. `src/lib/whatsapp-service.ts`
2. `src/app/api/settings/permissions/route.ts`
3. `src/app/api/whatsapp/messages/route.ts`
4. `src/app/api/whatsapp/sessions/route.ts`
5. `src/app/api/whatsapp/sessions/[id]/route.ts`
6. `src/app/api/whatsapp/send-reminders/route.ts`
7. `src/app/api/whatsapp/monitoring/route.ts`

## Solution

### Option 1: Force Turbopack Rebuild (Recommended)
1. Stop server completely
2. Delete ALL cache folders:
   - `.next/`
   - `node_modules/.cache/`
3. Kill ALL zombie node/bun processes
4. Restart server fresh

### Option 2: Disable Turbopack Temporarily
Edit `package.json`:
```json
"scripts": {
  "dev": "next dev"  // Remove --turbopack flag
}
```

### Option 3: Touch all affected files
Force Turbopack to recompile by modifying timestamp of all affected files.

## Implementation Steps

1. **Kill all processes:**
```bash
pkill -9 -f "node|next|bun"
```

2. **Clear all caches:**
```bash
rm -rf .next node_modules/.cache
```

3. **Wait for zombie cleanup:**
```bash
sleep 3
```

4. **Start fresh:**
```bash
bun run dev
```

5. **If still fails, disable Turbopack:**
Edit `package.json` to remove `--turbopack` from dev script.

## Verification
After restart:
- Console should NOT show `supabaseAdmin` error
- WhatsApp monitoring page should load
- API endpoints should respond correctly

## Notes
- This is environment/tooling issue, NOT code bug
- File content is correct - verified `supabaseAdmin` exists in supabase.ts
- May need to refresh browser (Ctrl+Shift+R) after server restart
