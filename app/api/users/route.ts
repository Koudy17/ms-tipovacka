import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { nickname } = await req.json();
  if (!nickname || nickname.trim().length < 2) {
    return NextResponse.json({ error: 'Přezdívka musí mít alespoň 2 znaky.' }, { status: 400 });
  }
  const sql = getSql();
  const trimmed = nickname.trim();
  await sql`INSERT INTO users (nickname) VALUES (${trimmed}) ON CONFLICT (nickname) DO NOTHING`;
  const rows = await sql`SELECT * FROM users WHERE LOWER(nickname) = LOWER(${trimmed})`;
  return NextResponse.json(rows[0]);
}
