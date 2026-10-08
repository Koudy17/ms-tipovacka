import { NextRequest, NextResponse } from 'next/server';
import { getSql, initSchema, auditLog } from '@/lib/db';
import { checkAdminAuth } from '@/lib/adminAuth';
import { fetchFixturesByIds } from '@/lib/apifootball';
import { applyFixture, insertFixture } from '@/lib/matchSync';
import { refreshSquadsIfStale } from '@/lib/scorers';

export const maxDuration = 60;

// Přidá zápasy z API (podle ID) mezi vybrané pro tipovačku a načte soupisky jejich týmů.
//   POST { "ids": [1234, 5678] }
export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 });
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return NextResponse.json({ error: 'Chybí API_FOOTBALL_KEY.' }, { status: 500 });

  const { ids } = await req.json().catch(() => ({}));
  if (!Array.isArray(ids) || !ids.length || ids.length > 60 || ids.some((x: unknown) => !Number.isInteger(x))) {
    return NextResponse.json({ error: 'Pošli ids: [číslo, …] (max. 60).' }, { status: 400 });
  }

  const sql = getSql();
  try { await sql`SELECT featured, league_name FROM matches LIMIT 1`; } catch { await initSchema(); }

  const fixtures = await fetchFixturesByIds(key, ids);
  const teams = new Map<number, string>();
  const added: string[] = [];
  for (const f of fixtures) {
    await insertFixture(f);
    // zápas může být rovnou živý nebo dohraný (např. přidáváš starší zápas) – srovnat stav
    const row = (await sql`SELECT id, status, home_score, away_score, scorer_ids, goal_scorers FROM matches WHERE id = ${f.fixture.id}`)[0];
    await applyFixture(key, f, row as never);
    teams.set(f.teams.home.id, f.teams.home.name);
    teams.set(f.teams.away.id, f.teams.away.name);
    added.push(`${f.teams.home.name} – ${f.teams.away.name} (${f.league.name}, ${f.fixture.date})`);
  }
  const squads = await refreshSquadsIfStale(key, [...teams].map(([id, name]) => ({ id, name })));
  const missing = ids.filter((id: number) => !fixtures.some(f => f.fixture.id === id));
  await auditLog('ADD_FIXTURES', 'match', { ids, added: added.length }, 'admin');
  return NextResponse.json({ ok: true, added, notFound: missing, squads });
}
