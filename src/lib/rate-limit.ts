import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Redis client
// For development without Upstash, you can use in-memory store
let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;

// Only create Redis client if environment variables are set
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  // Rate limiter for auth endpoints (login, register)
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 requests per 15 minutes
    analytics: true,
    prefix: "@upstash/ratelimit",
  });
}

/**
 * Rate limit authentication attempts
 * @param identifier - IP address or user identifier
 * @returns { success: boolean, limit: number, remaining: number, reset: number }
 */
export async function rateLimitAuth(identifier: string) {
  // If rate limiting is not configured, allow all requests (dev mode)
  if (!ratelimit) {
    console.warn("Rate limiting not configured - allowing request (dev mode)");
    return { success: true, limit: 5, remaining: 5, reset: Date.now() };
  }

  try {
    const result = await ratelimit.limit(identifier);
    return result;
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Fail open - allow request if rate limiter is down
    return { success: true, limit: 5, remaining: 5, reset: Date.now() };
  }
}

/**
 * More permissive rate limiter for general API endpoints
 */
export const apiRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 requests per minute
      analytics: true,
      prefix: "@upstash/ratelimit/api",
    })
  : null;
