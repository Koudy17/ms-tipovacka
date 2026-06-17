import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { checkPassword } from '@/lib/passwordPolicy';

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

export async function POST(req: NextRequest) {
  const { userId, currentPassword, newPassword } = await req.json();

  if (!userId || !currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Chybí parametry.' }, { status: 400 });
  }
  const policy = checkPassword(newPassword);
  if (!policy.ok) {
    const failed = policy.rules.filter(r => !r.valid).map(r => r.label).join(', ');
    return NextResponse.json({ error: `Heslo nesplňuje požadavky: ${failed}.` }, { status: 400 });
  }

  const sql = getSql();
  const rows = await sql`SELECT * FROM users WHERE id = ${userId}`;
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Uživatel nenalezen.' }, { status: 404 });
  }

  const user = rows[0];
  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: 'Špatné současné heslo.' }, { status: 401 });
  }

  const hash = await bcrypt.hash(newPassword, 10);
  const sessionToken = randomBytes(32).toString('hex');
  const sessionExpiresAt = new Date(Date.now() + COOKIE_MAX_AGE * 1000);
  await sql`UPDATE users SET password_hash = ${hash}, must_change_password = FALSE, session_token = ${sessionToken}, session_expires_at = ${sessionExpiresAt.toISOString()} WHERE id = ${userId}`;

  const res = NextResponse.json({ ok: true });
  res.cookies.set('session_token', sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
  return res;
}
