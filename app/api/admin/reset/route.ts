import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { checkAdminAuth } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 });
  const { confirmWord } = await req.json();
  if (confirmWord !== 'RESET') {
    return NextResponse.json({ error: 'Chybí potvrzení. Pošli confirmWord: "RESET".' }, { status: 400 });
  }
  const sql = getSql();
  await sql`DELETE FROM tips`;
  await sql`DELETE FROM users`;
  await sql`DELETE FROM matches WHERE stage = 'TEST'`;
  return NextResponse.json({ ok: true });
}
