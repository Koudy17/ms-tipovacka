import { NextRequest, NextResponse } from 'next/server';
import { getSql, auditLog } from '@/lib/db';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? 'admin123';

const TEST_MATCHES = [
  { id: 9000001, home: 'Chorvatsko', away: 'Belgie', kickoff: '2026-06-02T16:00:00Z' },
  { id: 9000002, home: 'Gruzie', away: 'Rumunsko', kickoff: '2026-06-02T17:00:00Z' },
  { id: 9000003, home: 'Maroko', away: 'Madagaskar', kickoff: '2026-06-02T17:00:00Z' },
  { id: 9000004, home: 'Wales', away: 'Ghana', kickoff: '2026-06-02T18:45:00Z' },
  { id: 9000005, home: 'Filipíny', away: 'Guam', kickoff: '2026-06-03T11:30:00Z' },
  { id: 9000006, home: 'Gibraltar', away: 'Britské Panenské ostrovy', kickoff: '2026-06-03T17:00:00Z' },
  { id: 9000007, home: 'Albánie', away: 'Izrael', kickoff: '2026-06-03T18:00:00Z' },
  { id: 9000008, home: 'DR Kongo', away: 'Dánsko', kickoff: '2026-06-03T18:00:00Z' },
  { id: 9000009, home: 'Lucembursko', away: 'Itálie', kickoff: '2026-06-03T18:45:00Z' },
  { id: 9000010, home: 'Nizozemsko', away: 'Alžírsko', kickoff: '2026-06-03T18:45:00Z' },
  { id: 9000011, home: 'Polsko', away: 'Nigérie', kickoff: '2026-06-03T18:45:00Z' },
  { id: 9000012, home: 'Panama', away: 'Dominikánská republika', kickoff: '2026-06-04T00:45:00Z' },
  { id: 9000013, home: 'Jižní Korea', away: 'Salvador', kickoff: '2026-06-04T01:00:00Z' },
  { id: 9000014, home: 'Severní Irsko', away: 'Guinea', kickoff: '2026-06-04T16:00:00Z' },
  { id: 9000015, home: 'Slovinsko', away: 'Kypr', kickoff: '2026-06-04T16:00:00Z' },
  { id: 9000016, home: 'Írán', away: 'Mali', kickoff: '2026-06-04T16:30:00Z' },
  { id: 9000017, home: 'Andorra', away: 'Lichtenštejnsko', kickoff: '2026-06-04T17:00:00Z' },
  { id: 9000018, home: 'Švédsko', away: 'Řecko', kickoff: '2026-06-04T17:00:00Z' },
  { id: 9000019, home: 'Španělsko', away: 'Irák', kickoff: '2026-06-04T19:00:00Z' },
  { id: 9000020, home: 'Francie', away: 'Pobřeží slonoviny', kickoff: '2026-06-04T19:10:00Z' },
  { id: 9000021, home: 'Česko', away: 'Guatemala', kickoff: '2026-06-05T00:00:00Z' },
  { id: 9000022, home: 'Mexiko', away: 'Srbsko', kickoff: '2026-06-05T02:00:00Z' },
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
  await auditLog('INSERT', 'test-matches', { count: TEST_MATCHES.length }, 'admin');
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = req.headers.get('x-admin-token');
  if (auth !== ADMIN_TOKEN) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 });

  const sql = getSql();
  const ids = TEST_MATCHES.map(m => m.id);
  await sql`DELETE FROM tips WHERE match_id = ANY(${ids})`;
  await sql`DELETE FROM matches WHERE id = ANY(${ids})`;
  await auditLog('DELETE', 'test-matches', { ids, count: ids.length }, 'admin');
  return NextResponse.json({ ok: true });
}
