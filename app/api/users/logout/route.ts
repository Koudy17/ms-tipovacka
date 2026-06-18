import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value;
  if (token) {
    const sql = getSql();
    await sql`DELETE FROM sessions WHERE token = ${token}`;
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('session_token', '', { maxAge: 0, path: '/' });
  return res;
}
