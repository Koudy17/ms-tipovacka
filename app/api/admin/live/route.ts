import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN!;

export async function POST(req: NextRequest) {
  const auth = req.headers.get('x-admin-token');
  if (auth !== ADMIN_TOKEN) return NextResponse.json({ error: 'NeautorizovĂˇno.' }, { status: 401 });

  const { matchId, homeScore, awayScore } = await req.json();
  const sql = getSql();

  // UloĹľĂ­ prĹŻbÄ›ĹľnĂ˝ vĂ˝sledek ale STATUS zĹŻstane 'live' â€” body se nepoÄŤĂ­tajĂ­
  await sql`
    UPDATE matches
    SET home_score = ${Number(homeScore)},
        away_score = ${Number(awayScore)},
        status = 'live'
    WHERE id = ${Number(matchId)}
  `;

  return NextResponse.json({ ok: true });
}
