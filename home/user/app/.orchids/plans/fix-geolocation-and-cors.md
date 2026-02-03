# Fix Geolocation Error & allowedDevOrigins for iframe

## Requirements
Fix dua console errors:
1. **Geolocation error** - "User denied Geolocation" dalam iframe environment
2. **Cross-origin warning** - Add `allowedDevOrigins` untuk support iframe embedding

## Current State Analysis

### 1. Geolocation Issue
- **File:** `src/components/hr/AttendanceContent.tsx`
- **Problem:** `navigator.geolocation.getCurrentPosition()` dipanggil dalam `useEffect` tanpa check jika dalam iframe
- **Error:** Browser block geolocation dalam iframe/preview environment kerana security restrictions

### 2. Cross-Origin Warning
- **File:** `next.config.ts`
- **Problem:** Tiada `allowedDevOrigins` config
- **Warning:** `Cross origin request detected from 3000-xxx.orchids.cloud`

## Implementation Phases

### Phase 1: Fix Geolocation in AttendanceContent.tsx
**File:** `src/components/hr/AttendanceContent.tsx`

**Changes:**
1. Add helper function to detect iframe:
```typescript
const isInIframe = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};
```

2. Modify `requestLocation()` function to gracefully handle iframe:
```typescript
const requestLocation = () => {
  // Skip geolocation in iframe environments
  if (isInIframe()) {
    setLocError("Lokasi tidak tersedia dalam preview mode");
    return;
  }
  
  if (!navigator.geolocation) {
    setLocError("Geolocation tidak disokong oleh pelayar anda");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy
      });
      setLocError(null);
    },
    (err) => {
      // More specific error messages
      if (err.code === err.PERMISSION_DENIED) {
        setLocError("Sila benarkan akses lokasi dalam tetapan browser");
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        setLocError("Lokasi tidak tersedia. Pastikan GPS aktif.");
      } else {
        setLocError("Gagal mendapatkan lokasi. Sila cuba lagi.");
      }
      console.error("Geolocation error:", err);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
};
```

3. Update UI to show friendly message when in iframe:
- Show info badge instead of error when in preview mode
- Allow clock-in/out tanpa lokasi dalam preview (for testing)

### Phase 2: Add allowedDevOrigins in next.config.ts
**File:** `next.config.ts`

**Add config:**
```typescript
const nextConfig: NextConfig = {
  // ... existing config
  
  allowedDevOrigins: [
    "localhost:3000",
    "*.orchids.cloud",
    "*.vercel.app",
  ],
  
  // ... rest of config
};
```

**Full updated config:**
```typescript
import type { NextConfig } from "next";
import path from "node:path";

const LOADER = path.resolve(__dirname, 'src/visual-edits/component-tagger-loader.js');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  outputFileTracingRoot: path.resolve(__dirname, '../../'),
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  allowedDevOrigins: [
    "localhost:3000",
    "*.orchids.cloud", 
    "*.vercel.app",
  ],
  turbopack: {
    rules: {
      "*.{jsx,tsx}": {
        loaders: [LOADER]
      }
    }
  }
};

export default nextConfig;
```

## Files to Modify
1. `src/components/hr/AttendanceContent.tsx` - Add iframe detection & graceful handling
2. `next.config.ts` - Add `allowedDevOrigins` array

## Testing
1. Refresh browser after changes
2. Console should no longer show geolocation error
3. Cross-origin warning should disappear
4. Attendance page should show "Preview mode" badge instead of error

## Notes
- Geolocation akan berfungsi normal bila app dibuka directly (bukan dalam iframe)
- `allowedDevOrigins` hanya untuk dev mode - production tidak terjejas
