import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return NextResponse.json({ error: 'Nejsi přihlášen.' }, { status: 401 });
  const rows = await getSql()`SELECT notify_reminders, notify_results FROM users WHERE id = ${userId}`;
  return NextResponse.json({ reminders: rows[0].notify_reminders, results: rows[0].notify_results });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return NextResponse.json({ error: 'Nejsi přihlášen.' }, { status: 401 });
  const { reminders, results } = await req.json().catch(() => ({}));
  const sql = getSql();
  if (typeof reminders === 'boolean') await sql`UPDATE users SET notify_reminders = ${reminders} WHERE id = ${userId}`;
  if (typeof results === 'boolean') await sql`UPDATE users SET notify_results = ${results} WHERE id = ${userId}`;
  return NextResponse.json({ ok: true });
}
