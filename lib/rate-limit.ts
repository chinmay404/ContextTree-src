import { NextResponse } from "next/server";

interface RateLimitOptions {
  interval: number;
  uniqueTokenPerInterval: number;
}

interface TokenBucket {
  count: number;
  lastRefill: number;
}

class RateLimit {
  private interval: number;
  private uniqueTokenPerInterval: number;
  private buckets: Map<string, TokenBucket>;

  constructor(options: RateLimitOptions) {
    this.interval = options.interval;
    this.uniqueTokenPerInterval = options.uniqueTokenPerInterval;
    this.buckets = new Map();
  }

  async check(response: typeof NextResponse, limit: number, token: string): Promise<void> {
    const now = Date.now();
    const bucket = this.buckets.get(token);

    if (!bucket) {
      // First request for this token
      this.buckets.set(token, {
        count: 1,
        lastRefill: now,
      });
      return;
    }

    // Calculate how much time has passed since last refill
    const timePassed = now - bucket.lastRefill;
    
    // If interval has passed, reset the bucket
    if (timePassed >= this.interval) {
      bucket.count = 1;
      bucket.lastRefill = now;
      return;
    }

    // Check if limit exceeded
    if (bucket.count >= limit) {
      throw new Error("Rate limit exceeded");
    }

    // Increment count
    bucket.count++;

    // Clean up old buckets to prevent memory leaks
    if (this.buckets.size > this.uniqueTokenPerInterval) {
      this.cleanup(now);
    }
  }

  private cleanup(now: number): void {
    for (const [token, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill >= this.interval) {
        this.buckets.delete(token);
      }
    }
  }
}

export default function rateLimit(options: RateLimitOptions): RateLimit {
  return new RateLimit(options);
}
