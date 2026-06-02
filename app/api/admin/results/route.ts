import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { calcPoints } from '@/lib/scoring';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? 'admin123';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('x-admin-token');
  if (auth !== ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 });
  }

  const { matchId, homeScore, awayScore } = await req.json();
  const sql = getSql();

  await sql`
    UPDATE matches SET home_score = ${Number(homeScore)}, away_score = ${Number(awayScore)}, status = 'finished'
    WHERE id = ${Number(matchId)}
  `;

  const tips = await sql`SELECT * FROM tips WHERE match_id = ${Number(matchId)}`;
  for (const tip of tips) {
    const pts = calcPoints(Number(homeScore), Number(awayScore), tip.home_tip, tip.away_tip);
    await sql`UPDATE tips SET points = ${pts} WHERE id = ${tip.id}`;
  }

  return NextResponse.json({ ok: true, updated: tips.length });
}
