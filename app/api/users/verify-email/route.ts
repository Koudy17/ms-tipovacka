import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { getClientIp, rateLimit } from '@/lib/rateLimit';
import { hashToken } from '@/lib/verifyEmail';

export async function POST(req: NextRequest) {
  if (!rateLimit(`verify:${getClientIp(req)}`, 20, 15 * 60_000).allowed) {
    return NextResponse.json({ error: 'Příliš mnoho pokusů, zkus to za chvíli.' }, { status: 429 });
  }
  const { token } = await req.json().catch(() => ({}));
  if (typeof token !== 'string' || token.length < 20) {
    return NextResponse.json({ error: 'Odkaz je neplatný.' }, { status: 400 });
  }
  const sql = getSql();
  // Jednorázové: označit jako použitý a rovnou ověřit, v jednom kroku
  const used = await sql`
    UPDATE email_verifications SET used_at = NOW()
    WHERE token_hash = ${hashToken(token)} AND used_at IS NULL AND expires_at > NOW()
    RETURNING user_id, email`;
  if (!used.length) return NextResponse.json({ error: 'Odkaz je neplatný nebo vypršel. Nech si poslat nový.' }, { status: 400 });

  // Jen když se adresa mezitím nezměnila
  await sql`UPDATE users SET email_verified_at = NOW() WHERE id = ${used[0].user_id} AND LOWER(email) = LOWER(${used[0].email})`;
  return NextResponse.json({ ok: true });
}
