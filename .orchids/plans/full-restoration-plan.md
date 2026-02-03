# Full System Restoration Plan - Kembara Sufi OSYS

## Requirements

Restore semua 1,122 files dari GitHub repository `osys-kembarasufi` sambil mengekalkan 3 features baru yang telah ditambah:
1. WhatsApp Monitor (Bouncer Dashboard)
2. WhatsApp Reminder
3. Clock In function (AttendanceContent)

## Current Situation Analysis

### Kerosakan Yang Berlaku
| Metric | Sebelum (osys/main) | Sekarang (HEAD) | Status |
|--------|---------------------|-----------------|--------|
| Total Files | 1,122 | 191 | **931 files HILANG** |
| Components | 100+ | ~20 | CRITICAL |
| API Routes | 50+ | ~15 | CRITICAL |
| HR Module | Complete | Partial | DAMAGED |
| Operations | Complete | Missing | DAMAGED |

### Files Yang Hilang (Kritikal)
- Semua dashboard components
- HR module (payroll, claims, memos, recruitment, interns)
- Operations module (roster, trip dates, pricing)
- Task management module
- Media library module
- Agent portal
- Sales/Lead reports
- Dan banyak lagi...

### Features Baru Yang Perlu DIKEKALKAN
1. **MonitoringBouncer.tsx** - WhatsApp monitoring dashboard dengan chat view
2. **WhatsAppManagement.tsx** - Session management UI
3. **whatsapp-service.ts** (versi baru) - Multi-instance WhatsApp dengan Baileys
4. **API routes baru:**
   - `/api/whatsapp/messages/route.ts`
   - `/api/whatsapp/monitoring/route.ts`
   - `/api/whatsapp/sessions/route.ts`
   - `/api/whatsapp/sessions/[id]/route.ts`
   - `/api/whatsapp/sync/route.ts`

## Implementation Phases

### Phase 1: Backup Features Baru (WAJIB DULU)
Sebelum restore, backup semua files baru yang perlu dikekalkan:

**Files to backup:**
```
src/components/whatsapp/MonitoringBouncer.tsx
src/components/whatsapp/WhatsAppManagement.tsx
src/lib/whatsapp-service.ts (versi baru dengan multi-instance)
src/app/api/whatsapp/messages/route.ts
src/app/api/whatsapp/monitoring/route.ts
src/app/api/whatsapp/sessions/route.ts
src/app/api/whatsapp/sessions/[id]/route.ts
src/app/api/whatsapp/sync/route.ts
src/app/whatsapp/page.tsx
src/app/whatsapp/monitoring/page.tsx
```

### Phase 2: Full Reset ke osys/main
```bash
git reset --hard osys/main
```

Ini akan restore semua 1,122 files ke versi asal dari GitHub.

### Phase 3: Re-add Features Baru
Selepas reset, tambah balik files yang di-backup:

1. **WhatsApp Monitoring Dashboard**
   - Copy back `MonitoringBouncer.tsx`
   - Copy back `WhatsAppManagement.tsx`
   - Copy back API routes

2. **WhatsApp Service (Enhanced)**
   - Merge `whatsapp-service.ts` baru dengan yang asal
   - Pastikan multi-instance support kekal

3. **Update MainLayout.tsx**
   - Tambah navigation ke WhatsApp Monitoring
   - Ensure sidebar links work

### Phase 4: Verify & Test
1. Test login/auth flow
2. Test Quotation Calculator
3. Test HR modules (clock in, attendance)
4. Test WhatsApp monitoring
5. Test all sidebar navigation

## Files Critical untuk Implementation

### Dari osys/main (akan di-restore)
- `src/app/page.tsx` - Main entry point
- `src/components/MainLayout.tsx` - Navigation controller
- `src/components/Sidebar.tsx` - Sidebar navigation
- `src/components/AuthGate.tsx` - Auth wrapper
- `src/contexts/AuthContext.tsx` - Auth context
- `src/lib/supabase.ts` - Database connection
- Semua 100+ komponen lain

### Features Baru (akan di-merge)
- `src/components/whatsapp/MonitoringBouncer.tsx` - **KEKALKAN**
- `src/components/whatsapp/WhatsAppManagement.tsx` - **KEKALKAN**
- `src/lib/whatsapp-service.ts` (enhanced version) - **KEKALKAN**
- New API routes - **KEKALKAN**

## Risk Mitigation

1. **Backup dulu** - Semua files baru di-backup sebelum reset
2. **Test selepas restore** - Verify semua module berfungsi
3. **Git commit** - Commit selepas setiap phase selesai

## Expected Outcome

Selepas restoration:
- Semua 1,122 files restored
- Quotation Calculator berfungsi penuh
- HR Module lengkap (clock in, payroll, claims, etc.)
- Operations Module berfungsi
- WhatsApp Monitor (feature baru) kekal
- WhatsApp Reminder kekal

## Commands Summary

```bash
# Phase 1: Backup
mkdir -p /tmp/wa-backup
cp src/components/whatsapp/MonitoringBouncer.tsx /tmp/wa-backup/
cp src/components/whatsapp/WhatsAppManagement.tsx /tmp/wa-backup/
cp src/lib/whatsapp-service.ts /tmp/wa-backup/
cp -r src/app/api/whatsapp/messages /tmp/wa-backup/
cp -r src/app/api/whatsapp/monitoring /tmp/wa-backup/
cp -r src/app/api/whatsapp/sessions /tmp/wa-backup/
cp -r src/app/api/whatsapp/sync /tmp/wa-backup/
cp -r src/app/whatsapp /tmp/wa-backup/

# Phase 2: Reset
git reset --hard osys/main

# Phase 3: Restore features baru
cp /tmp/wa-backup/MonitoringBouncer.tsx src/components/whatsapp/
cp /tmp/wa-backup/WhatsAppManagement.tsx src/components/whatsapp/
# ... dan seterusnya

# Phase 4: Install dependencies & test
bun install
bun run dev
```
