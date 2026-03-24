import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Pre-configured rate limiters per endpoint category
const rateLimiters = {
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '15 m'),
    prefix: 'rl:auth',
  }),
  messages: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'),
    prefix: 'rl:msg',
  }),
  swipes: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    prefix: 'rl:swp',
  }),
  photos: new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(30, '1 h'),
    prefix: 'rl:pho',
  }),
  conversations: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    prefix: 'rl:cnv',
  }),
  listings: new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(10, '1 h'),
    prefix: 'rl:lst',
  }),
  webhooks: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    prefix: 'rl:whk',
  }),
  default: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    prefix: 'rl:def',
  }),
};

/**
 * Check rate limit for a given category and identifier.
 * Fails open — if Redis is unreachable, requests pass through.
 *
 * @param {string} category - key in rateLimiters (e.g., 'messages', 'photos')
 * @param {string} identifier - user ID or IP address
 * @returns {{ limited: boolean, headers: object }}
 */
export async function checkRateLimit(category, identifier) {
  try {
    const limiter = rateLimiters[category] || rateLimiters.default;
    const { success, limit, remaining, reset } = await limiter.limit(identifier);

    const headers = {
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(reset),
    };

    if (!success) {
      headers['Retry-After'] = String(Math.ceil((reset - Date.now()) / 1000));
      return { limited: true, headers };
    }

    return { limited: false, headers };
  } catch (err) {
    // Fail open — don't block users if Redis is down
    console.error('Rate limit check failed (allowing request):', err.message);
    return { limited: false, headers: {} };
  }
}

/** Extract client IP from request (Vercel sets x-forwarded-for) */
export function getClientIP(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}
