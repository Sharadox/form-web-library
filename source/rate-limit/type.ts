export interface RateLimitOptions {
  /** Window length in milliseconds. */
  window: number;
  /** Allowed hits per key inside the window. */
  maximum: number;
}

/** Records a hit for a key; returns false when the key is over its limit. */
export type RateLimiter = (key: string, now?: number) => boolean;
