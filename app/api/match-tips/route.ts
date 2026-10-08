import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get('matchId');
  if (!matchId) return NextResponse.json({ error: 'Chybí matchId' }, { status: 400 });

  const sql = getSql();

  // Tipy ostatních zobrazit až po výkopu
  const match = await sql`SELECT kickoff FROM matches WHERE id = ${Number(matchId)}`;
  if (!match.length) return NextResponse.json({ error: 'Zápas nenalezen.' }, { status: 404 });
  if (new Date() < new Date(match[0].kickoff)) {
    return NextResponse.json({ error: 'Tipy budou viditelné po výkopu.' }, { status: 403 });
  }

  const tips = await sql`
    SELECT t.home_tip, t.away_tip, t.scorer_tip, t.points, t.scorer_points, u.nickname, u.id as user_id
    FROM tips t
    JOIN users u ON u.id = t.user_id
    WHERE t.match_id = ${Number(matchId)}
    ORDER BY u.nickname ASC
  `;
  return NextResponse.json(tips);
}
