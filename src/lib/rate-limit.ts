// Simple in-memory rate limiter for API routes
// For production, consider using Redis or similar

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = identifier;
  
  let record = rateLimitStore.get(key);
  
  // If no record or window expired, create new one
  if (!record || record.resetTime < now) {
    record = {
      count: 1,
      resetTime: now + config.windowMs
    };
    rateLimitStore.set(key, record);
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: record.resetTime
    };
  }
  
  // Increment count
  record.count++;
  
  // Check if over limit
  if (record.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime
    };
  }
  
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime
  };
}

// Pre-configured rate limits
export const RATE_LIMITS = {
  // Login: 5 attempts per 15 minutes per IP
  login: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5
  },
  // WhatsApp send: 30 messages per minute per user
  whatsappSend: {
    windowMs: 60 * 1000,
    maxRequests: 30
  },
  // General API: 100 requests per minute per user
  general: {
    windowMs: 60 * 1000,
    maxRequests: 100
  },
  // Password reset: 3 attempts per hour per IP
  passwordReset: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 3
  }
};
