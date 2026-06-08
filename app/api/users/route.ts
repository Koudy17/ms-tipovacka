import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
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

  return NextResponse.json({
    id: user.id,
    nickname: user.nickname,
    mustChangePassword: user.must_change_password ?? false,
  });
}
