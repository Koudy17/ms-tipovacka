import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'Chybí userId' }, { status: 400 });
  const sql = getSql();
  const tips = await sql`SELECT * FROM tips WHERE user_id = ${Number(userId)}`;
  return NextResponse.json(tips);
}

export async function POST(req: NextRequest) {
  const { userId, matchId, homeTip, awayTip } = await req.json();
  const sql = getSql();

  const rows = await sql`SELECT kickoff FROM matches WHERE id = ${Number(matchId)}`;
  if (!rows.length) return NextResponse.json({ error: 'Zápas nenalezen.' }, { status: 404 });

  if (new Date() >= new Date(rows[0].kickoff)) {
    return NextResponse.json({ error: 'Tipy jsou uzamčeny – zápas již začal.' }, { status: 403 });
  }

  await sql`
    INSERT INTO tips (user_id, match_id, home_tip, away_tip)
    VALUES (${Number(userId)}, ${Number(matchId)}, ${Number(homeTip)}, ${Number(awayTip)})
    ON CONFLICT (user_id, match_id) DO UPDATE SET home_tip = EXCLUDED.home_tip, away_tip = EXCLUDED.away_tip
  `;
  return NextResponse.json({ ok: true });
}
