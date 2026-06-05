import { NextRequest, NextResponse } from 'next/server';
import { getSql, auditLog } from '@/lib/db';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? 'admin123';

const TEST_MATCHES = [
  // 6.6. (CEST → UTC)
  { id: 9000101, home: 'Kanada',      away: 'Irsko',               kickoff: '2026-06-05T23:30:00Z' }, // 01:30 CEST
  { id: 9000102, home: 'Belgie',      away: 'Tunisko',             kickoff: '2026-06-06T13:00:00Z' }, // 15:00 CEST
  { id: 9000103, home: 'Portugalsko', away: 'Chile',               kickoff: '2026-06-06T17:45:00Z' }, // 19:45 CEST
  { id: 9000104, home: 'USA',         away: 'Německo',             kickoff: '2026-06-06T18:30:00Z' }, // 20:30 CEST
  { id: 9000105, home: 'Panama',      away: 'Bosna a Hercegovina', kickoff: '2026-06-06T19:00:00Z' }, // 21:00 CEST
  { id: 9000106, home: 'Švýcarsko',   away: 'Austrálie',           kickoff: '2026-06-06T19:00:00Z' }, // 21:00 CEST
  { id: 9000107, home: 'Anglie',      away: 'Nový Zéland',         kickoff: '2026-06-06T20:00:00Z' }, // 22:00 CEST
  // 7.6. (CEST → UTC)
  { id: 9000108, home: 'Brazílie',    away: 'Egypt',               kickoff: '2026-06-06T22:00:00Z' }, // 00:00 CEST
  { id: 9000109, home: 'Venezuela',   away: 'Turecko',             kickoff: '2026-06-06T22:00:00Z' }, // 00:00 CEST
  { id: 9000110, home: 'Argentina',   away: 'Honduras',            kickoff: '2026-06-07T00:00:00Z' }, // 02:00 CEST
  { id: 9000111, home: 'Chorvatsko',  away: 'Slovinsko',           kickoff: '2026-06-07T18:45:00Z' }, // 20:45 CEST
  { id: 9000112, home: 'Maroko',      away: 'Norsko',              kickoff: '2026-06-07T19:00:00Z' }, // 21:00 CEST
  // 8.6. (CEST → UTC)
  { id: 9000113, home: 'Kolumbie',    away: 'Jordánsko',           kickoff: '2026-06-07T23:00:00Z' }, // 01:00 CEST
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
