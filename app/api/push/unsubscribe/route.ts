import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return NextResponse.json({ error: 'Nejsi přihlášen.' }, { status: 401 });
  const { endpoint } = await req.json().catch(() => ({}));
  if (typeof endpoint !== 'string') return NextResponse.json({ error: 'Chybí endpoint.' }, { status: 400 });
  await getSql()`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint} AND user_id = ${userId}`;
  return NextResponse.json({ ok: true });
}
