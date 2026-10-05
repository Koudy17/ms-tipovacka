import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { emailVerificationEnabled } from '@/lib/verifyEmail';

// Appka podle toho ukáže (nebo ne) upozornění „Potvrď e-mail"
export async function GET(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return NextResponse.json({ error: 'Nejsi přihlášen.' }, { status: 401 });
  const enabled = emailVerificationEnabled();
  if (!enabled) return NextResponse.json({ enabled, hasEmail: false, verified: true });
  const rows = await getSql()`SELECT email, email_verified_at FROM users WHERE id = ${userId}`;
  return NextResponse.json({ enabled, hasEmail: !!rows[0]?.email, verified: !!rows[0]?.email_verified_at, email: rows[0]?.email ?? null });
}
