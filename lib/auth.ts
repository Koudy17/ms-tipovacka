import type { NextRequest } from 'next/server';
import { getSql } from '@/lib/db';

// ID přihlášeného uživatele podle session cookie, nebo null.
export async function getSessionUserId(req: NextRequest): Promise<number | null> {
  const token = req.cookies.get('session_token')?.value;
  if (!token) return null;
  const rows = await getSql()`SELECT user_id FROM sessions WHERE token = ${token} AND expires_at > NOW()`;
  return rows.length ? (rows[0].user_id as number) : null;
}
