const WA_SERVER_URL = typeof window !== 'undefined' 
  ? (process.env.NEXT_PUBLIC_WA_SERVER_URL || '') 
  : (process.env.NEXT_PUBLIC_WA_SERVER_URL || '');

export function getWABaseUrl(): string {
  return WA_SERVER_URL || '';
}

export function waUrl(path: string): string {
  const base = getWABaseUrl();
  if (base) return `${base}${path}`;
  return path;
}
