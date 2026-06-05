import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get('matchId');
  if (!matchId) return NextResponse.json({ error: 'Chybí matchId' }, { status: 400 });

  const sql = getSql();
  const tips = await sql`
    SELECT t.home_tip, t.away_tip, t.scorer_tip, t.points, t.scorer_points, u.nickname, u.id as user_id
    FROM tips t
    JOIN users u ON u.id = t.user_id
    WHERE t.match_id = ${Number(matchId)}
    ORDER BY u.nickname ASC
  `;
  return NextResponse.json(tips);
}
