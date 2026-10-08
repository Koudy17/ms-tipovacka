import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/adminAuth';
import { fetchFixturesByDate } from '@/lib/apifootball';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Hledání zápasů v API podle dne (YYYY-MM-DD), volitelně textu (tým nebo soutěž) a ID soutěže.
//   /api/admin/find-fixtures?date=2026-10-26&q=barcelona
export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 });
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return NextResponse.json({ error: 'Chybí API_FOOTBALL_KEY.' }, { status: 500 });

  const date = req.nextUrl.searchParams.get('date') ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: 'Zadej date=YYYY-MM-DD.' }, { status: 400 });
  const q = norm(req.nextUrl.searchParams.get('q') ?? '');
  const league = Number(req.nextUrl.searchParams.get('league')) || undefined;

  let all;
  try {
    all = await fetchFixturesByDate(key, date, league);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Hledání selhalo.' }, { status: 502 });
  }
  const found = all
    .filter(f => !q || [f.teams.home.name, f.teams.away.name, f.league.name, f.league.country ?? ''].some(x => norm(x).includes(q)))
    .sort((a, b) => +new Date(a.fixture.date) - +new Date(b.fixture.date))
    .slice(0, 80)
    .map(f => ({
      id: f.fixture.id,
      kickoff: f.fixture.date,
      league: `${f.league.name}${f.league.country ? ' (' + f.league.country + ')' : ''}`,
      leagueId: f.league.id,
      home: f.teams.home.name,
      away: f.teams.away.name,
      status: f.fixture.status.short,
    }));
  return NextResponse.json({ total: all.length, shown: found.length, fixtures: found });
}
