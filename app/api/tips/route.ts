import { NextRequest, NextResponse } from 'next/server';
import { getSql, auditLog } from '@/lib/db';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  const sessionToken = req.cookies.get('session_token')?.value;
  if (!userId) return NextResponse.json({ error: 'Chybí userId' }, { status: 400 });
  if (!sessionToken) return NextResponse.json({ error: 'Nejsi přihlášen.' }, { status: 401 });
  const sql = getSql();
  const session = await sql`SELECT id FROM users WHERE id = ${Number(userId)} AND session_token = ${sessionToken} AND session_expires_at > NOW()`;
  if (!session.length) return NextResponse.json({ error: 'Neplatná nebo vypršená session. Přihlas se znovu.' }, { status: 401 });
  const tips = await sql`SELECT * FROM tips WHERE user_id = ${Number(userId)}`;
  return NextResponse.json(tips);
}

export async function POST(req: NextRequest) {
  const { userId, matchId, homeTip, awayTip, scorerTip } = await req.json();
  const sessionToken = req.cookies.get('session_token')?.value;
  const sql = getSql();

  if (!sessionToken) return NextResponse.json({ error: 'Nejsi přihlášen.' }, { status: 401 });
  const session = await sql`SELECT id FROM users WHERE id = ${Number(userId)} AND session_token = ${sessionToken} AND session_expires_at > NOW()`;
  if (!session.length) return NextResponse.json({ error: 'Neplatná nebo vypršená session. Přihlas se znovu.' }, { status: 401 });

  const rows = await sql`SELECT kickoff FROM matches WHERE id = ${Number(matchId)}`;
  if (!rows.length) return NextResponse.json({ error: 'Zápas nenalezen.' }, { status: 404 });

  if (new Date() >= new Date(rows[0].kickoff)) {
    return NextResponse.json({ error: 'Tipy jsou uzamčeny – zápas již začal.' }, { status: 403 });
  }

  const scorer = scorerTip?.trim() || null;
  await sql`
    INSERT INTO tips (user_id, match_id, home_tip, away_tip, scorer_tip)
    VALUES (${Number(userId)}, ${Number(matchId)}, ${Number(homeTip)}, ${Number(awayTip)}, ${scorer})
    ON CONFLICT (user_id, match_id) DO UPDATE SET
      home_tip = EXCLUDED.home_tip,
      away_tip = EXCLUDED.away_tip,
      scorer_tip = EXCLUDED.scorer_tip
  `;
  await auditLog('UPSERT', 'tip', { userId, matchId, homeTip, awayTip, scorerTip: scorer }, `user:${userId}`);
  return NextResponse.json({ ok: true });
}
