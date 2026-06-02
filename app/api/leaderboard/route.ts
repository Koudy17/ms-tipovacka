import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export async function GET() {
  const sql = getSql();
  const rows = await sql`
    SELECT
      u.id, u.nickname,
      COALESCE(SUM(COALESCE(t.points, 0) + COALESCE(t.scorer_points, 0)), 0) AS total_points,
      COUNT(CASE WHEN t.points IS NOT NULL THEN 1 END) AS scored_tips,
      COUNT(CASE WHEN t.points = 10 THEN 1 END) AS exact,
      COUNT(CASE WHEN t.points = 6 THEN 1 END) AS six,
      COUNT(CASE WHEN t.points = 4 THEN 1 END) AS winner,
      COALESCE(SUM(COALESCE(t.scorer_points, 0)), 0) AS scorer_bonus
    FROM users u
    LEFT JOIN tips t ON t.user_id = u.id
    GROUP BY u.id, u.nickname
    ORDER BY total_points DESC, u.nickname ASC
  `;
  return NextResponse.json(rows);
}
