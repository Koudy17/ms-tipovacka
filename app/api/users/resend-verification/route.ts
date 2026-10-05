import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { emailVerificationEnabled, sendVerification } from '@/lib/verifyEmail';

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return NextResponse.json({ error: 'Nejsi přihlášen.' }, { status: 401 });
  if (!emailVerificationEnabled()) return NextResponse.json({ error: 'Ověřování e-mailu je vypnuté.' }, { status: 404 });

  const rows = await getSql()`SELECT email, email_verified_at FROM users WHERE id = ${userId}`;
  const u = rows[0];
  if (!u?.email) return NextResponse.json({ error: 'U účtu není e-mail.' }, { status: 400 });
  if (u.email_verified_at) return NextResponse.json({ ok: true, alreadyVerified: true });

  const sent = await sendVerification(userId, u.email, req.nextUrl.origin);
  if (!sent) return NextResponse.json({ error: 'Poslat se nepodařilo (nebo jsi to zkoušel moc často). Zkus to později.' }, { status: 429 });
  return NextResponse.json({ ok: true });
}
