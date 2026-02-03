// Input validation utilities for API routes
// Prevents XSS, SQL injection, and other input-based attacks

// Sanitize string input - remove potential XSS
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
    .trim();
}

// Validate email format
export function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Validate phone number (Malaysian format)
export function isValidPhone(phone: unknown): boolean {
  if (typeof phone !== 'string') return false;
  // Remove spaces and dashes
  const cleaned = phone.replace(/[\s-]/g, '');
  // Malaysian phone: starts with 01, 6, or +6
  const phoneRegex = /^(\+?6?0?1)[0-46-9][0-9]{7,8}$/;
  return phoneRegex.test(cleaned);
}

// Validate UUID format
export function isValidUUID(uuid: unknown): boolean {
  if (typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Validate and sanitize number
export function sanitizeNumber(input: unknown, min?: number, max?: number): number | null {
  const num = Number(input);
  if (isNaN(num)) return null;
  if (min !== undefined && num < min) return null;
  if (max !== undefined && num > max) return null;
  return num;
}

// Validate date string (ISO format)
export function isValidDate(date: unknown): boolean {
  if (typeof date !== 'string') return false;
  const parsed = Date.parse(date);
  return !isNaN(parsed);
}

// Sanitize object - recursively sanitize all string values
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = {} as T;
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      (result as any)[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      (result as any)[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) : 
        typeof item === 'object' && item !== null ? sanitizeObject(item as Record<string, unknown>) : 
        item
      );
    } else if (typeof value === 'object' && value !== null) {
      (result as any)[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      (result as any)[key] = value;
    }
  }
  
  return result;
}

// Validate required fields in object
export function validateRequired(obj: Record<string, unknown>, requiredFields: string[]): string[] {
  const missing: string[] = [];
  
  for (const field of requiredFields) {
    const value = obj[field];
    if (value === undefined || value === null || value === '') {
      missing.push(field);
    }
  }
  
  return missing;
}

// Check for SQL injection patterns
export function hasSQLInjection(input: unknown): boolean {
  if (typeof input !== 'string') return false;
  
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/i,
    /(--)/, // SQL comment
    /(;)/, // Statement terminator
    /(\bOR\b\s+\d+\s*=\s*\d+)/i, // OR 1=1
    /(\bAND\b\s+\d+\s*=\s*\d+)/i, // AND 1=1
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
}

// Password strength validation
export function isStrongPassword(password: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (typeof password !== 'string') {
    return { valid: false, errors: ['Password must be a string'] };
  }
  
  if (password.length < 8) {
    errors.push('Password mesti sekurang-kurangnya 8 aksara');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password mesti mengandungi huruf besar');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password mesti mengandungi huruf kecil');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password mesti mengandungi nombor');
  }
  
  return { valid: errors.length === 0, errors };
}
