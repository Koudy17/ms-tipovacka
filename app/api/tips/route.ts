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
  const { userId, matchId, homeTip, awayTip, scorerPlayerId } = await req.json();
  const sessionToken = req.cookies.get('session_token')?.value;
  const sql = getSql();

  if (!sessionToken) return NextResponse.json({ error: 'Nejsi přihlášen.' }, { status: 401 });
  const session = await sql`SELECT user_id FROM sessions WHERE token = ${sessionToken} AND user_id = ${Number(userId)} AND expires_at > NOW()`;
  if (!session.length) return NextResponse.json({ error: 'Neplatná nebo vypršená session. Přihlas se znovu.' }, { status: 401 });

  const rows = await sql`SELECT kickoff, home_team_id, away_team_id FROM matches WHERE id = ${Number(matchId)}`;
  if (!rows.length) return NextResponse.json({ error: 'Zápas nenalezen.' }, { status: 404 });

  if (new Date() >= new Date(rows[0].kickoff)) {
    return NextResponse.json({ error: 'Tipy jsou uzamčeny – zápas již začal.' }, { status: 403 });
  }

  // Střelec: hráč musí patřit k jednomu ze dvou týmů zápasu. Ukládáme ID (pro vyhodnocení) i jméno (pro zobrazení).
  let scorerId: number | null = null;
  let scorerName: string | null = null;
  if (scorerPlayerId != null && scorerPlayerId !== '') {
    const found = await sql`
      SELECT id, name FROM players
      WHERE id = ${Number(scorerPlayerId)} AND team_id IN (${rows[0].home_team_id}, ${rows[0].away_team_id})`;
    if (!found.length) return NextResponse.json({ error: 'Vybraný hráč nehraje v tomhle zápase.' }, { status: 400 });
    scorerId = found[0].id;
    scorerName = found[0].name;
  }
  await sql`
    INSERT INTO tips (user_id, match_id, home_tip, away_tip, scorer_tip, scorer_player_id)
    VALUES (${Number(userId)}, ${Number(matchId)}, ${Number(homeTip)}, ${Number(awayTip)}, ${scorerName}, ${scorerId})
    ON CONFLICT (user_id, match_id) DO UPDATE SET
      home_tip = EXCLUDED.home_tip,
      away_tip = EXCLUDED.away_tip,
      scorer_tip = EXCLUDED.scorer_tip,
      scorer_player_id = EXCLUDED.scorer_player_id
  `;
  await auditLog('UPSERT', 'tip', { userId, matchId, homeTip, awayTip, scorerTip: scorerName }, `user:${userId}`);
  return NextResponse.json({ ok: true });
}
