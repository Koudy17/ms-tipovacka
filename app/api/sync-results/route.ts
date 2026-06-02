import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { calcPoints } from '@/lib/scoring';

export async function GET() {
  const apiKey = process.env.FOOTBALL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Chybí FOOTBALL_API_KEY.' }, { status: 500 });
  }

  const sql = getSql();

  const res = await fetch(
    'https://api.football-data.org/v4/competitions/2000/matches?status=FINISHED',
    { headers: { 'X-Auth-Token': apiKey }, cache: 'no-store' }
  );
  if (!res.ok) return NextResponse.json({ error: `API error: ${res.status}` }, { status: 502 });

  const data = await res.json();
  const apiMatches = data.matches ?? [];

  let updated = 0;
  for (const am of apiMatches) {
    const homeGoals = am.score?.fullTime?.home;
    const awayGoals = am.score?.fullTime?.away;
    if (homeGoals == null || awayGoals == null) continue;

    const rows = await sql`
      SELECT id FROM matches
      WHERE home_team = ${am.homeTeam?.name} AND away_team = ${am.awayTeam?.name} AND status != 'finished'
    `;
    if (!rows.length) continue;

    const matchId = rows[0].id;
    await sql`UPDATE matches SET home_score = ${homeGoals}, away_score = ${awayGoals}, status = 'finished' WHERE id = ${matchId}`;

    const tips = await sql`SELECT * FROM tips WHERE match_id = ${matchId}`;
    for (const tip of tips) {
      const pts = calcPoints(homeGoals, awayGoals, tip.home_tip, tip.away_tip);
      await sql`UPDATE tips SET points = ${pts} WHERE id = ${tip.id}`;
    }
    updated++;
  }

  return NextResponse.json({ ok: true, updatedMatches: updated });
}
