import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? 'admin123';

const TEST_MATCHES = [
  { id: 9000001, home: 'Česko', away: 'Slovensko', kickoff: '2026-06-02T14:00:00Z' },
  { id: 9000002, home: 'Německo', away: 'Francie', kickoff: '2026-06-02T16:00:00Z' },
  { id: 9000003, home: 'Brazílie', away: 'Argentina', kickoff: '2026-06-02T18:00:00Z' },
];

export async function POST(req: NextRequest) {
  const auth = req.headers.get('x-admin-token');
  if (auth !== ADMIN_TOKEN) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 });

  const sql = getSql();
  for (const m of TEST_MATCHES) {
    await sql`
      INSERT INTO matches (id, home_team, away_team, kickoff, status, stage, matchday, group_name)
      VALUES (${m.id}, ${m.home}, ${m.away}, ${m.kickoff}, 'scheduled', 'TEST', 0, 'TEST')
      ON CONFLICT (id) DO NOTHING
    `;
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = req.headers.get('x-admin-token');
  if (auth !== ADMIN_TOKEN) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 });

  const sql = getSql();
  const ids = TEST_MATCHES.map(m => m.id);
  await sql`DELETE FROM tips WHERE match_id = ANY(${ids}::int[])`;
  await sql`DELETE FROM matches WHERE id = ANY(${ids}::int[])`;
  return NextResponse.json({ ok: true });
}
