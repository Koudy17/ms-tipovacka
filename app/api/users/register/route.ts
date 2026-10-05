import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSql, auditLog } from '@/lib/db';
import { checkPassword } from '@/lib/passwordPolicy';
import { getClientIp, rateLimit } from '@/lib/rateLimit';
import { startSession } from '@/lib/session';
import { emailVerificationEnabled, sendVerification } from '@/lib/verifyEmail';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  const { allowed, retryAfterSec } = rateLimit(`register:${getClientIp(req)}`, 5, 60 * 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: `Příliš mnoho registrací z tvé adresy. Zkus to za ${Math.ceil(retryAfterSec / 60)} min.` },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? '').trim().toLowerCase();
  const nickname = String(body.nickname ?? '').trim();
  const password = String(body.password ?? '');

  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Zadej platný e-mail.' }, { status: 400 });
  }
  if (nickname.length < 2 || nickname.length > 30) {
    return NextResponse.json({ error: 'Přezdívka musí mít 2 až 30 znaků.' }, { status: 400 });
  }
  const policy = checkPassword(password);
  if (!policy.ok) {
    const failed = policy.rules.filter(r => !r.valid).map(r => r.label).join(', ');
    return NextResponse.json({ error: `Heslo nesplňuje požadavky: ${failed}.` }, { status: 400 });
  }

  const sql = getSql();
  const taken = await sql`
    SELECT
      EXISTS (SELECT 1 FROM users WHERE LOWER(nickname) = LOWER(${nickname})) AS nick,
      EXISTS (SELECT 1 FROM users WHERE LOWER(email) = ${email}) AS mail`;
  if (taken[0].nick) return NextResponse.json({ error: 'Tato přezdívka je už obsazená.' }, { status: 409 });
  if (taken[0].mail) return NextResponse.json({ error: 'Tento e-mail už je zaregistrovaný. Zkus „Zapomenuté heslo".' }, { status: 409 });

  const hash = await bcrypt.hash(password, 10);
  let user;
  try {
    const rows = await sql`
      INSERT INTO users (nickname, email, password_hash, must_change_password)
      VALUES (${nickname}, ${email}, ${hash}, FALSE)
      RETURNING id, nickname`;
    user = rows[0];
  } catch {
    // souběžná registrace stejné přezdívky / e-mailu (unique)
    return NextResponse.json({ error: 'Přezdívka nebo e-mail je už obsazený.' }, { status: 409 });
  }

  if (emailVerificationEnabled()) {
    // chyba při odeslání nesmí zablokovat registraci – uživatel si pak pošle odkaz znovu z appky
    try { await sendVerification(user.id, email, req.nextUrl.origin); } catch (e) { console.error('[register] potvrzení e-mailu selhalo', e); }
  }
  await auditLog('REGISTER', 'user', { userId: user.id, nickname }, `user:${user.id}`);
  const res = NextResponse.json({ id: user.id, nickname: user.nickname, mustChangePassword: false });
  await startSession(res, user.id);
  return res;
}
