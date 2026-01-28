import { NextRequest } from 'next/server';
import { kv } from '@vercel/kv';

interface RateLimitResult {
  isRateLimited: boolean;
  remaining: number;
  resetTime: number;
  retryAfter: number;
}

/**
 * Rate limiting using Vercel KV (Redis)
 * This persists across deployments, unlike in-memory storage
 */
export async function rateLimit(
  request: NextRequest,
  maxRequests: number = 10,
  windowMs: number = 60000
): Promise<RateLimitResult> {
  // Get IP address from request
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
             request.headers.get('x-real-ip') ||
             'unknown';

  const now = Date.now();
  const key = `ratelimit:${ip}:${request.nextUrl.pathname}`;

  try {
    // Get current count and reset time from KV
    const data = await kv.get<{ count: number; resetTime: number }>(key);

    let count = 0;
    let resetTime = now + windowMs;

    if (data && data.resetTime > now) {
      // Existing rate limit window is still active
      count = data.count + 1;
      resetTime = data.resetTime;
    } else {
      // New rate limit window
      count = 1;
      resetTime = now + windowMs;
    }

    // Store updated count with TTL (expire after window)
    const ttlSeconds = Math.ceil(windowMs / 1000);
    await kv.set(key, { count, resetTime }, { ex: ttlSeconds });

    // Check if rate limit exceeded
    const isRateLimited = count > maxRequests;
    const remaining = Math.max(0, maxRequests - count);

    return {
      isRateLimited,
      remaining,
      resetTime,
      retryAfter: Math.ceil((resetTime - now) / 1000),
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    // Fallback: Allow the request if KV fails (fail open)
    // This prevents KV outages from blocking all traffic
    return {
      isRateLimited: false,
      remaining: maxRequests,
      resetTime: now + windowMs,
      retryAfter: 0,
    };
  }
}
