import { randomBytes } from 'crypto';
import type { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 dní v sekundách

// Založí session (multi-device) a nastaví httpOnly cookie na odpovědi.
export async function startSession(res: NextResponse, userId: number): Promise<void> {
  const sql = getSql();
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + COOKIE_MAX_AGE * 1000);
  await sql`
    INSERT INTO sessions (token, user_id, expires_at)
    VALUES (${token}, ${userId}, ${expiresAt.toISOString()})
    ON CONFLICT (token) DO NOTHING
  `;
  await sql`DELETE FROM sessions WHERE user_id = ${userId} AND expires_at < NOW()`;
  res.cookies.set('session_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}
