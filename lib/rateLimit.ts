import type { NextRequest } from 'next/server';

// Jednoduchý in-memory limiter (stejný princip jako u loginu; na serverless je per instance).
const buckets = new Map<string, { count: number; resetAt: number }>();

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

export function rateLimit(key: string, max: number, windowMs: number): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const e = buckets.get(key);
  if (!e || now > e.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (e.count >= max) return { allowed: false, retryAfterSec: Math.ceil((e.resetAt - now) / 1000) };
  e.count++;
  return { allowed: true, retryAfterSec: 0 };
}
