# Fix Attendance DELETE and PATCH Endpoints

## Requirements
User reported that delete function is not working. Upon investigation, the API route `/api/hr/attendance/route.ts` is missing the `DELETE` and `PATCH` endpoints that the frontend expects.

## Current State
- **Frontend** (`AttendanceContent.tsx`): Calls `DELETE /api/hr/attendance?id=xxx` and `PATCH /api/hr/attendance`
- **Backend** (`route.ts`): Only has `GET` and `POST` methods - missing `DELETE` and `PATCH`

## Implementation Plan

### Phase 1: Add DELETE Endpoint
Add DELETE handler to `src/app/api/hr/attendance/route.ts`:
- Accept `id` from query params
- Verify user has HR/Admin role before allowing delete
- Delete record from `hr_attendance_logs` table
- Return success/error response

### Phase 2: Add PATCH Endpoint  
Add PATCH handler to `src/app/api/hr/attendance/route.ts`:
- Accept `id`, `type`, `status`, `timestamp`, `note` from request body
- Verify user has HR/Admin role before allowing edit
- Update record in `hr_attendance_logs` table
- Return updated record

### Phase 3: Add Authorization
- Import `withAuth` or `withRole` from `@/lib/api-auth`
- Wrap DELETE and PATCH with role check for `['admin', 'superadmin', 'hr', 'hr-manager', 'c-suite']`

## Files to Modify
1. `src/app/api/hr/attendance/route.ts` - Add DELETE and PATCH methods

## Code to Add

```typescript
// DELETE endpoint
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
    }

    const { error } = await supabase
      .from("hr_attendance_logs")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH endpoint
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, type, status, timestamp, note } = body;

    if (!id) {
      return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("hr_attendance_logs")
      .update({ type, status, timestamp, note, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ log: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## Testing
1. Go to Kehadiran page as superadmin
2. Click "Semua Staff" tab
3. Try delete a record - should work
4. Try edit a record - should save changes
