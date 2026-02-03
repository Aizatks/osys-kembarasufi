import { NextRequest, NextResponse } from "next/server";
import { fetchPackageDates, PACKAGE_SHEET_MAP, SheetConfig, findSheetKeyFromPackageName } from "@/lib/sheets";
import { withAuth } from "@/lib/api-auth";

export const GET = withAuth(async (req: NextRequest, user) => {
  const { searchParams } = new URL(req.url);
  const pkgName = searchParams.get("pkgName");
  const gid = searchParams.get("gid");
  const rowStartParam = searchParams.get("rowStart");
  const rowEndParam = searchParams.get("rowEnd");

  if (!gid) {
    return NextResponse.json({ error: "GID is required" }, { status: 400 });
  }

  // Find config from PACKAGE_SHEET_MAP
  let config: SheetConfig | null = null;
  
  // 1. Try to find by pkgName first using the same function as main data
  if (pkgName) {
    const sheetKey = findSheetKeyFromPackageName(pkgName);
    if (sheetKey && PACKAGE_SHEET_MAP[sheetKey]) {
      config = PACKAGE_SHEET_MAP[sheetKey];
    }
  }
  
  // 2. If not found by pkgName, try to find by gid (less specific)
  if (!config && gid) {
    config = Object.values(PACKAGE_SHEET_MAP).find(c => c.gid === gid) || null;
  }

  // 3. If still no config, use a very generic default
  if (!config) {
     config = { gid, dateCol: 3, surCol: -1, availCol: 5 };
  }
  
  // 4. Override rowStart and rowEnd if provided in query params
  const finalConfig = { ...config };
  if (rowStartParam) finalConfig.rowStart = parseInt(rowStartParam);
  if (rowEndParam) finalConfig.rowEnd = parseInt(rowEndParam);

  const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
  const dates = await fetchPackageDates(SHEET_ID, gid, finalConfig);

  return NextResponse.json({ dates });
});
