import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSql } from '@/lib/db';
import { checkPassword } from '@/lib/passwordPolicy';
import { getSessionUserId } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  // Heslo si mění jen přihlášený uživatel – ID se bere ze session, ne z těla požadavku
  const userId = await getSessionUserId(req);
  if (!userId) return NextResponse.json({ error: 'Nejsi přihlášen.' }, { status: 401 });

  const limit = rateLimit(`chpw:${userId}`, 5, 15 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: `Příliš mnoho pokusů. Zkus to za ${Math.ceil(limit.retryAfterSec / 60)} min.` }, { status: 429 });
  }

  const { currentPassword, newPassword } = await req.json().catch(() => ({}));
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Chybí parametry.' }, { status: 400 });
  }
  const policy = checkPassword(newPassword);
  if (!policy.ok) {
    const failed = policy.rules.filter(r => !r.valid).map(r => r.label).join(', ');
    return NextResponse.json({ error: `Heslo nesplňuje požadavky: ${failed}.` }, { status: 400 });
  }

  const sql = getSql();
  const rows = await sql`SELECT password_hash FROM users WHERE id = ${userId}`;
  const hash = rows[0]?.password_hash as string | null | undefined;
  if (!hash) return NextResponse.json({ error: 'Účet nemá nastavené heslo. Kontaktuj admina.' }, { status: 400 });
  if (!(await bcrypt.compare(currentPassword, hash))) {
    return NextResponse.json({ error: 'Špatné současné heslo.' }, { status: 401 });
  }

  const token = req.cookies.get('session_token')?.value ?? '';
  await sql`UPDATE users SET password_hash = ${await bcrypt.hash(newPassword, 10)}, must_change_password = FALSE WHERE id = ${userId}`;
  await sql`DELETE FROM sessions WHERE user_id = ${userId} AND token <> ${token}`; // ostatní zařízení se odhlásí
  return NextResponse.json({ ok: true });
}
