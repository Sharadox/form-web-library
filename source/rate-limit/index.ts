import type { RateLimiter, RateLimitOptions } from "@sharadox/form-web-library/rate-limit/type";

/** In-memory sliding-window rate limiter. Best effort: each server instance keeps its own memory. */
export function createRateLimiter({ window, maximum }: RateLimitOptions): RateLimiter {
  const hits = new Map<string, number[]>();
  return (key, now = Date.now()) => {
    const recent = (hits.get(key) ?? []).filter((time) => now - time < window);
    if (recent.length >= maximum) {
      hits.set(key, recent);
      return false;
    }
    hits.set(key, [...recent, now]);
    return true;
  };
}
