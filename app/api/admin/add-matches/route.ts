import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { checkAdminAuth } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Neautorizovano.' }, { status: 401 });

  const { matches } = await req.json();
  const sql = getSql();
  let inserted = 0;

  for (const m of matches) {
    const res = await sql`
      INSERT INTO matches (home_team, away_team, kickoff, stage, status)
      VALUES (${m.home}, ${m.away}, ${m.kickoff}, ${m.stage}, 'upcoming')
      ON CONFLICT DO NOTHING
    `;
    if (res.count > 0) inserted++;
  }

  return NextResponse.json({ ok: true, inserted });
}
