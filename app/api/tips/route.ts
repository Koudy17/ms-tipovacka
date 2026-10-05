import { NextRequest, NextResponse } from 'next/server';
import { getSql, auditLog } from '@/lib/db';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  const sessionToken = req.cookies.get('session_token')?.value;
  if (!userId) return NextResponse.json({ error: 'Chybí userId' }, { status: 400 });
  if (!sessionToken) return NextResponse.json({ error: 'Nejsi přihlášen.' }, { status: 401 });
  const sql = getSql();
  const session = await sql`SELECT user_id FROM sessions WHERE token = ${sessionToken} AND user_id = ${Number(userId)} AND expires_at > NOW()`;
  if (!session.length) return NextResponse.json({ error: 'Neplatná nebo vypršená session. Přihlas se znovu.' }, { status: 401 });
  const tips = await sql`SELECT * FROM tips WHERE user_id = ${Number(userId)}`;
  return NextResponse.json(tips);
}

export async function POST(req: NextRequest) {
  const { userId, matchId, homeTip, awayTip, scorerTip, isDouble } = await req.json();
  const sessionToken = req.cookies.get('session_token')?.value;
  const sql = getSql();

  if (!sessionToken) return NextResponse.json({ error: 'Nejsi přihlášen.' }, { status: 401 });
  const session = await sql`SELECT user_id FROM sessions WHERE token = ${sessionToken} AND user_id = ${Number(userId)} AND expires_at > NOW()`;
  if (!session.length) return NextResponse.json({ error: 'Neplatná nebo vypršená session. Přihlas se znovu.' }, { status: 401 });

  const rows = await sql`SELECT kickoff, matchday FROM matches WHERE id = ${Number(matchId)}`;
  if (!rows.length) return NextResponse.json({ error: 'Zápas nenalezen.' }, { status: 404 });

  if (new Date() >= new Date(rows[0].kickoff)) {
    return NextResponse.json({ error: 'Tipy jsou uzamčeny – zápas již začal.' }, { status: 403 });
  }

  // Double: jeden na kolo. Přesunout ho jde jen na jiný zápas, pokud ten s doublem ještě nezačal.
  const wantDouble = isDouble === true;
  if (wantDouble) {
    const matchday = rows[0].matchday;
    if (matchday == null) return NextResponse.json({ error: 'Double nelze použít u zápasu bez kola.' }, { status: 400 });
    const others = await sql`
      SELECT t.id, m.kickoff FROM tips t
      JOIN matches m ON m.id = t.match_id
      WHERE t.user_id = ${Number(userId)} AND t.is_double AND m.matchday = ${matchday} AND t.match_id != ${Number(matchId)}`;
    if (others.some(o => new Date() >= new Date(o.kickoff))) {
      return NextResponse.json({ error: 'Double v tomto kole už jsi použil u zápasu, který začal.' }, { status: 409 });
    }
    for (const o of others) await sql`UPDATE tips SET is_double = FALSE WHERE id = ${o.id}`;
  }

  const scorer = scorerTip?.trim() || null;
  await sql`
    INSERT INTO tips (user_id, match_id, home_tip, away_tip, scorer_tip, is_double)
    VALUES (${Number(userId)}, ${Number(matchId)}, ${Number(homeTip)}, ${Number(awayTip)}, ${scorer}, ${wantDouble})
    ON CONFLICT (user_id, match_id) DO UPDATE SET
      home_tip = EXCLUDED.home_tip,
      away_tip = EXCLUDED.away_tip,
      scorer_tip = EXCLUDED.scorer_tip,
      is_double = EXCLUDED.is_double
  `;
  await auditLog('UPSERT', 'tip', { userId, matchId, homeTip, awayTip, scorerTip: scorer, isDouble: wantDouble }, `user:${userId}`);
  return NextResponse.json({ ok: true });
}
