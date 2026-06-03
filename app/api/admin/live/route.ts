import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? 'admin123';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('x-admin-token');
  if (auth !== ADMIN_TOKEN) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 });

  const { matchId, homeScore, awayScore } = await req.json();
  const sql = getSql();

  // Uloží průběžný výsledek ale STATUS zůstane 'live' — body se nepočítají
  await sql`
    UPDATE matches
    SET home_score = ${Number(homeScore)},
        away_score = ${Number(awayScore)},
        status = 'live'
    WHERE id = ${Number(matchId)}
  `;

  return NextResponse.json({ ok: true });
}
