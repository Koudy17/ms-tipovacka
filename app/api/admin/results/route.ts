import { NextRequest, NextResponse } from 'next/server';
import { getSql, auditLog } from '@/lib/db';
import { calcPoints, calcScorerBonus } from '@/lib/scoring';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN!;

export async function POST(req: NextRequest) {
  const auth = req.headers.get('x-admin-token');
  if (auth !== ADMIN_TOKEN) {
    return NextResponse.json({ error: 'NeautorizovĂˇno.' }, { status: 401 });
  }

  const { matchId, homeScore, awayScore, goalScorers } = await req.json();
  const sql = getSql();

  const scorersList: string[] = Array.isArray(goalScorers)
    ? goalScorers
    : (goalScorers ?? '').split(',').map((s: string) => s.trim()).filter(Boolean);

  await sql`
    UPDATE matches
    SET home_score = ${Number(homeScore)},
        away_score = ${Number(awayScore)},
        status = 'finished',
        goal_scorers = ${scorersList.join(',')}
    WHERE id = ${Number(matchId)}
  `;

  const tips = await sql`SELECT * FROM tips WHERE match_id = ${Number(matchId)}`;
  for (const tip of tips) {
    const pts = calcPoints(Number(homeScore), Number(awayScore), tip.home_tip, tip.away_tip);
    const scorerPts = calcScorerBonus(tip.scorer_tip, scorersList);
    await sql`UPDATE tips SET points = ${pts}, scorer_points = ${scorerPts} WHERE id = ${tip.id}`;
  }

  await auditLog('RESULT', 'match', { matchId, homeScore, awayScore, goalScorers: scorersList, tipsUpdated: tips.length }, 'admin');
  return NextResponse.json({ ok: true, updated: tips.length });
}
