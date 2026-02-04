import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { data: roster, error } = await supabase
      .from("operations_roster")
      .select(`
        *,
        staff (name, role),
        trip_dates (depart_date, return_date, package_id)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ roster });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "GENERATE_ROSTER") {
      // 1. Fetch upcoming trip dates
      const { data: trips } = await supabase
        .from("trip_dates")
        .select("*")
        .gte("depart_date", new Date().toISOString().split("T")[0])
        .order("depart_date", { ascending: true });

      if (!trips || trips.length === 0) return NextResponse.json({ message: "No upcoming trips" });

      // 2. Fetch available staff with 'Operation' role or specific skills
      const { data: staff } = await supabase
        .from("staff")
        .select("*")
        .eq("role", "Operation");

      if (!staff || staff.length === 0) return NextResponse.json({ error: "No operations staff found" }, { status: 400 });

      // 3. Logic: 1 staff per 25 pax (example)
      const PAX_PER_STAFF = 25;
      const newRoster = [];

      for (const trip of trips) {
        const paxCount = trip.seats_total - trip.seats_available;
        const staffNeeded = Math.max(1, Math.ceil(paxCount / PAX_PER_STAFF));
        
        // Simple round-robin for now
        for (let i = 0; i < staffNeeded; i++) {
          const staffIndex = (newRoster.length + i) % staff.length;
          const assignedStaff = staff[staffIndex];

          newRoster.push({
            staff_id: assignedStaff.id,
            trip_date_id: trip.id,
            created_at: new Date().toISOString()
          });

          // Also create a calendar event
          await supabase.from("calendar_events").insert([{
            staff_id: assignedStaff.id,
            title: `Airport Duty: Trip ID ${trip.id}`,
            start_at: `${trip.depart_date}T06:00:00Z`, // Early morning duty
            end_at: `${trip.depart_date}T12:00:00Z`,
            type: "DUTY",
            metadata: { trip_id: trip.id }
          }]);
        }
      }

      const { data, error } = await supabase
        .from("operations_roster")
        .insert(newRoster)
        .select();

      if (error) throw error;

      return NextResponse.json({ roster: data });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
