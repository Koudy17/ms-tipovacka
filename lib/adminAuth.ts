import { NextRequest } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getClientIp, isBlocked, rateLimit } from '@/lib/rateLimit';

export function checkAdminAuth(req: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) throw new Error('ADMIN_TOKEN není nastaven v environment variables.');

  // Po 15 špatných pokusech za minutu z jedné adresy se odmítne vše (i správné heslo)
  const failKey = `admin-fail:${getClientIp(req)}`;
  if (isBlocked(failKey, 15)) return false;

  const given = Buffer.from(req.headers.get('x-admin-token') ?? '');
  const expected = Buffer.from(token);
  const ok = given.length === expected.length && timingSafeEqual(given, expected);
  if (!ok) rateLimit(failKey, 15, 60_000);
  return ok;
}
