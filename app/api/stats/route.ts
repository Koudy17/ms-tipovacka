import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'Chybí userId' }, { status: 400 });

  const sql = getSql();

  const user = await sql`SELECT id, nickname FROM users WHERE id = ${Number(userId)}`;
  if (!user.length) return NextResponse.json({ error: 'Uživatel nenalezen' }, { status: 404 });

  const tips = await sql`
    SELECT
      t.home_tip, t.away_tip, t.scorer_tip, t.points, t.scorer_points,
      m.home_team, m.away_team, m.kickoff, m.home_score, m.away_score,
      m.status, m.id as match_id
    FROM tips t
    JOIN matches m ON m.id = t.match_id
    WHERE t.user_id = ${Number(userId)}
      AND m.kickoff <= NOW()
    ORDER BY m.kickoff DESC
  `;

  return NextResponse.json({ user: user[0], tips });
}
