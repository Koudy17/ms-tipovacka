import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { getSql, auditLog } from '@/lib/db';
import { checkPassword } from '@/lib/passwordPolicy';
import { getClientIp, rateLimit } from '@/lib/rateLimit';
import { startSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  const { allowed, retryAfterSec } = rateLimit(`reset:${getClientIp(req)}`, 30, 15 * 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: `Příliš mnoho pokusů. Zkus to za ${Math.ceil(retryAfterSec / 60)} min.` },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const token = String(body.token ?? '');
  const password = String(body.password ?? '');

  const policy = checkPassword(password);
  if (!policy.ok) {
    const failed = policy.rules.filter(r => !r.valid).map(r => r.label).join(', ');
    return NextResponse.json({ error: `Heslo nesplňuje požadavky: ${failed}.` }, { status: 400 });
  }

  const sql = getSql();
  const tokenHash = createHash('sha256').update(token).digest('hex');
  // Označ jako použitý rovnou v jednom dotazu – dva souběžné požadavky neprojdou oba
  const used = await sql`
    UPDATE password_resets SET used_at = NOW()
    WHERE token_hash = ${tokenHash} AND used_at IS NULL AND expires_at > NOW()
    RETURNING user_id`;
  if (!used.length) {
    return NextResponse.json({ error: 'Odkaz je neplatný nebo vypršel. Požádej o nový.' }, { status: 400 });
  }
  const userId = used[0].user_id as number;

  const hash = await bcrypt.hash(password, 10);
  await sql`UPDATE users SET password_hash = ${hash}, must_change_password = FALSE WHERE id = ${userId}`;
  await sql`DELETE FROM sessions WHERE user_id = ${userId}`; // odhlásí ostatní zařízení
  await auditLog('PASSWORD_RESET', 'user', { userId }, `user:${userId}`);

  const user = (await sql`SELECT id, nickname FROM users WHERE id = ${userId}`)[0];
  const res = NextResponse.json({ id: user.id, nickname: user.nickname, mustChangePassword: false });
  await startSession(res, userId);
  return res;
}
