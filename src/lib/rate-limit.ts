import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

// Same silent-no-op pattern as sendEmail() when RESEND_API_KEY is unset: rate limiting is
// skipped (never blocking) if Upstash isn't configured, so local dev works without an account.
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
    : null;

function makeLimiter(requests: number, window: `${number} ${"s" | "m" | "h"}`) {
  if (!redis) return null;
  return new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(requests, window), prefix: "storehike" });
}

const limiters = {
  login: makeLimiter(8, "5 m"),
  adminLogin: makeLimiter(5, "5 m"),
  register: makeLimiter(5, "1 h"),
  passwordReset: makeLimiter(3, "15 m"),
};

/** Returns true if the request is allowed, false if it should be rejected. */
export async function checkRateLimit(kind: keyof typeof limiters, identifier: string): Promise<boolean> {
  const limiter = limiters[kind];
  if (!limiter) return true;
  const { success } = await limiter.limit(`${kind}:${identifier}`);
  return success;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
