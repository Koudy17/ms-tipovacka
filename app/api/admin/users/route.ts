import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { checkAdminAuth } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sql = getSql();
  const rows = await sql`SELECT id, nickname, must_change_password, created_at FROM users ORDER BY nickname`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { nickname, password } = await req.json();
  if (!nickname || nickname.trim().length < 2) {
    return NextResponse.json({ error: 'Přezdívka musí mít alespoň 2 znaky.' }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Dočasné heslo musí mít alespoň 8 znaků.' }, { status: 400 });
  }
  const sql = getSql();
  const hash = await bcrypt.hash(password, 10);
  const rows = await sql`
    INSERT INTO users (nickname, password_hash, must_change_password)
    VALUES (${nickname.trim()}, ${hash}, TRUE)
    ON CONFLICT (nickname) DO UPDATE SET password_hash = ${hash}, must_change_password = TRUE
    RETURNING id, nickname, must_change_password
  `;
  return NextResponse.json(rows[0]);
}

export async function DELETE(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'Chybí userId.' }, { status: 400 });
  const sql = getSql();
  await sql`DELETE FROM tips WHERE user_id = ${userId}`;
  await sql`DELETE FROM users WHERE id = ${userId}`;
  return NextResponse.json({ ok: true });
}
