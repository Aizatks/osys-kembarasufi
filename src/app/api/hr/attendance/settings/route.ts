import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { withAuth, withRole } from "@/lib/api-auth";
import { JWTPayload } from "@/lib/auth";

// Extract coordinates from Google Maps URL
// Priority: @lat,lng in path (most accurate for place URLs) > query params > data params
const extractCoordsFromUrl = (url: string): { lat: number; lng: number } | null => {
  try {
    // First, decode URL in case it's encoded
    const decodedUrl = decodeURIComponent(url);
    
    // Priority 1: /@lat,lng pattern (most reliable for place/business URLs)
    // This appears right after /place/NAME/ or as the center coordinate
    // Match /@lat,lng,zoom format
    const atMatch = decodedUrl.match(/\/@(-?\d+\.?\d*),(-?\d+\.?\d*),/);
    if (atMatch) {
      return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
    }
    
    // Priority 2: ?q=lat,lng or &q=lat,lng (direct query)
    const qMatch = decodedUrl.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch) {
      return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
    }
    
    // Priority 3: ll=lat,lng
    const llMatch = decodedUrl.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (llMatch) {
      return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };
    }
    
    // Priority 4: place/lat,lng (direct coords in place path)
    const placeMatch = decodedUrl.match(/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (placeMatch) {
      return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };
    }

    // Priority 5: !3d[lat]!4d[lng] - but ONLY use as last resort
    // Find ALL occurrences and prefer the first one (usually the main marker)
    const allDMatches = [...decodedUrl.matchAll(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/g)];
    if (allDMatches.length > 0) {
      // If there's !8m2! prefix, it's usually the accurate marker position
      const markerMatch = decodedUrl.match(/!8m2!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
      if (markerMatch) {
        return { lat: parseFloat(markerMatch[1]), lng: parseFloat(markerMatch[2]) };
      }
      // Otherwise use the last !3d!4d (usually the destination)
      const lastMatch = allDMatches[allDMatches.length - 1];
      return { lat: parseFloat(lastMatch[1]), lng: parseFloat(lastMatch[2]) };
    }
    
    return null;
  } catch {
    return null;
  }
};

// POST endpoint to resolve shortened Google Maps URLs
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: "URL diperlukan" }, { status: 400 });
    }

    // Check if it's a shortened URL (goo.gl or maps.app.goo.gl)
    const isShortened = url.includes('goo.gl') || url.includes('maps.app.goo.gl');
    
    let finalUrl = url;
    
    if (isShortened) {
      // Follow redirects to get the full URL
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          redirect: 'follow',
        });
        finalUrl = response.url;
      } catch {
        // If HEAD fails, try GET
        const response = await fetch(url, {
          redirect: 'follow',
        });
        finalUrl = response.url;
      }
    }

    // Extract coordinates from the final URL
    const coords = extractCoordsFromUrl(finalUrl);
    
    if (coords) {
      return NextResponse.json({ 
        success: true, 
        lat: coords.lat, 
        lng: coords.lng,
        resolvedUrl: finalUrl 
      });
    } else {
      return NextResponse.json({ 
        error: "Tidak dapat mengekstrak koordinat dari URL",
        resolvedUrl: finalUrl 
      }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const GET = withAuth(async (req: NextRequest, user: JWTPayload) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("hr_attendance_settings")
      .select("*")
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return NextResponse.json({ settings: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const PUT = withRole(['admin', 'superadmin'], async (req: NextRequest, user: JWTPayload) => {
  try {
    const body = await req.json();
    const { 
      geofence_enabled, 
      geofence_radius, 
      allowed_locations, 
      remote_allowed,
      working_hours 
    } = body;

    // Check if settings exist
    const { data: existing } = await supabaseAdmin
      .from("hr_attendance_settings")
      .select("id")
      .single();

    let data, error;
    
    if (existing?.id) {
      // Update existing
      const result = await supabaseAdmin
        .from("hr_attendance_settings")
        .update({
          geofence_enabled,
          geofence_radius,
          allowed_locations,
          remote_allowed,
          working_hours,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      // Insert new
      const result = await supabaseAdmin
        .from("hr_attendance_settings")
        .insert([{
          geofence_enabled,
          geofence_radius,
          allowed_locations,
          remote_allowed,
          working_hours
        }])
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) throw error;

    return NextResponse.json({ settings: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
