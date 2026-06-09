import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

// --- In-memory rate limiter ---
// Max 5 pokusů za 60 sekund na jednu IP
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { allowed: true, retryAfterSec: 0 };
}

function resetRateLimit(ip: string) {
  loginAttempts.delete(ip);
}
// --- konec rate limiteru ---

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed, retryAfterSec } = checkRateLimit(ip);

  if (!allowed) {
    return NextResponse.json(
      { error: `Příliš mnoho pokusů. Zkus to za ${retryAfterSec} sekund.` },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
    );
  }

  const { nickname, password } = await req.json();
  if (!nickname || nickname.trim().length < 2) {
    return NextResponse.json({ error: 'Přezdívka musí mít alespoň 2 znaky.' }, { status: 400 });
  }
  if (!password || password.length < 1) {
    return NextResponse.json({ error: 'Zadej heslo.' }, { status: 400 });
  }

  const sql = getSql();
  const trimmed = nickname.trim();
  const rows = await sql`SELECT * FROM users WHERE LOWER(nickname) = LOWER(${trimmed})`;

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Přezdívka nenalezena. Požádej admina o přístup.' }, { status: 401 });
  }

  const user = rows[0];

  if (!user.password_hash) {
    return NextResponse.json({ error: 'Účet nemá nastavené heslo. Kontaktuj admina.' }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: 'Špatné heslo.' }, { status: 401 });
  }

  // Úspěch — resetuj rate limit pro tuto IP
  resetRateLimit(ip);

  const sessionToken = randomBytes(32).toString('hex');
  await sql`UPDATE users SET session_token = ${sessionToken} WHERE id = ${user.id}`;

  return NextResponse.json({
    id: user.id,
    nickname: user.nickname,
    mustChangePassword: user.must_change_password ?? false,
    sessionToken,
  });
}
