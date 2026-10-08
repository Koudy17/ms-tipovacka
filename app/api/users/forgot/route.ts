import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { getSql } from '@/lib/db';
import { getClientIp, rateLimit } from '@/lib/rateLimit';
import { sendMail } from '@/lib/mail';

const TOKEN_TTL_MS = 60 * 60_000; // odkaz platí hodinu
const MAX_PER_HOUR = 3; // max. žádostí na jeden účet za hodinu

export async function POST(req: NextRequest) {
  const { allowed, retryAfterSec } = rateLimit(`forgot:${getClientIp(req)}`, 20, 15 * 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: `Příliš mnoho žádostí. Zkus to za ${Math.ceil(retryAfterSec / 60)} min.` },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? '').trim().toLowerCase();
  // Odpověď je vždy stejná, ať účet existuje nebo ne (nezjistí se, kdo je registrovaný)
  const reply = NextResponse.json({ ok: true });
  if (!email || email.length > 254) return reply;

  const sql = getSql();
  const users = await sql`SELECT id, nickname FROM users WHERE LOWER(email) = ${email}`;
  if (!users.length) return reply;
  const user = users[0];

  const recent = await sql`
    SELECT COUNT(*)::int AS n FROM password_resets
    WHERE user_id = ${user.id} AND created_at > NOW() - INTERVAL '1 hour'`;
  if (recent[0].n >= MAX_PER_HOUR) return reply;

  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex'); // v DB jen hash
  await sql`
    INSERT INTO password_resets (token_hash, user_id, expires_at)
    VALUES (${tokenHash}, ${user.id}, ${new Date(Date.now() + TOKEN_TTL_MS).toISOString()})`;

  // Základ odkazu z env (ne z hlavičky požadavku – ta jde podvrhnout). Lokálně stačí origin.
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.NODE_ENV !== 'production' ? req.nextUrl.origin : '');
  if (!base) {
    console.error('[forgot] chybí NEXT_PUBLIC_SITE_URL, odkaz nelze sestavit');
    return reply;
  }
  await sendMail(
    email,
    'Emeho tipovačka – nové heslo',
    `Ahoj ${user.nickname},\n\nněkdo (doufáme, že ty) požádal o nové heslo do Emeho tipovačky.\n` +
      `Nastavíš ho tady (odkaz platí 1 hodinu a jde použít jen jednou):\n\n${base}/?reset=${token}\n\n` +
      `Pokud jsi o heslo nežádal, tenhle e-mail ignoruj, nic se nestane.`,
  );
  return reply;
}
