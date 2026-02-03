# Fix waManager Import Error

## Problem
Export name mismatch antara `whatsapp-service.ts` dan API routes:
- **whatsapp-service.ts** exports: `whatsappManager`
- **API routes** import: `waManager` (tidak wujud)

## Files Affected

### Source (export)
- `src/lib/whatsapp-service.ts` - Line 138: `export const whatsappManager = new WhatsAppManager();`

### Routes (import) - 5 files perlu fix
1. `src/app/api/whatsapp/monitoring/route.ts` - Line 2
2. `src/app/api/whatsapp/sync/route.ts` - Line 2
3. `src/app/api/whatsapp/sessions/route.ts` - Line 2
4. `src/app/api/whatsapp/sessions/[id]/route.ts` - Line 2
5. `src/app/api/whatsapp/messages/route.ts` - Line 2

## Solution Options

### Option A: Update API routes (Recommended)
Change all 5 files from:
```typescript
import { waManager } from '@/lib/whatsapp-service';
```
To:
```typescript
import { whatsappManager } from '@/lib/whatsapp-service';
```

Then find/replace all `waManager.` to `whatsappManager.` in each file.

### Option B: Add alias export in whatsapp-service.ts
Add at end of `src/lib/whatsapp-service.ts`:
```typescript
export { whatsappManager as waManager };
```

**Recommendation:** Option B is simpler - only 1 file change instead of 5.

## Implementation Steps

1. Edit `src/lib/whatsapp-service.ts`
2. Add alias export: `export { whatsappManager as waManager };`
3. Save and test

## Testing
After fix, refresh browser - WhatsApp monitoring page should load without build error.
