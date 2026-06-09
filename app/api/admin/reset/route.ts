import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN!;

export async function POST(req: NextRequest) {
  if (req.headers.get('x-admin-token') !== ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sql = getSql();
  await sql`DELETE FROM tips`;
  await sql`DELETE FROM users`;
  await sql`DELETE FROM matches WHERE stage = 'TEST'`;
  return NextResponse.json({ ok: true });
}
