import { NextResponse } from 'next/server';
import { fetchSheetData } from '@/lib/sheets';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET() {
  try {
    const data = await fetchSheetData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    return NextResponse.json({}, { status: 500 });
  }
}
