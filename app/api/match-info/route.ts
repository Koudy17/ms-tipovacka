import { NextRequest, NextResponse } from 'next/server';
import { cached } from '@/lib/apiCache';
import { fetchForm, fetchH2H } from '@/lib/apifootball';
import { getClientIp, rateLimit } from '@/lib/rateLimit';
import { getSql } from '@/lib/db';

// Před tipováním: forma obou týmů (posledních 5 zápasů v jakékoli soutěži) a posledních 5 vzájemných zápasů.
export async function GET(req: NextRequest) {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return NextResponse.json({ error: 'Chybí API_FOOTBALL_KEY.' }, { status: 500 });
  if (!rateLimit(`matchinfo:${getClientIp(req)}`, 60, 60_000).allowed) {
    return NextResponse.json({ error: 'Moc požadavků, zkus to za chvíli.' }, { status: 429 });
  }
  const home = Number(req.nextUrl.searchParams.get('home'));
  const away = Number(req.nextUrl.searchParams.get('away'));
  if (!Number.isInteger(home) || !Number.isInteger(away) || home <= 0 || away <= 0 || home === away) {
    return NextResponse.json({ error: 'Neplatné týmy.' }, { status: 400 });
  }

  // Jen dvojice týmů z vybraných zápasů – jinak by šlo libovolnými ID pálit placené API
  const known = await getSql()`
    SELECT 1 FROM matches WHERE featured AND ((home_team_id = ${home} AND away_team_id = ${away}) OR (home_team_id = ${away} AND away_team_id = ${home})) LIMIT 1`;
  if (!known.length) return NextResponse.json({ error: 'Neznámý zápas.' }, { status: 404 });

  const form = (id: number) => cached(`form:${id}`, 6 * 3600, () => fetchForm(key, id)).then(r => r.data).catch(() => null);
  const [homeForm, awayForm, h2h] = await Promise.all([
    form(home),
    form(away),
    cached(`h2h:${Math.min(home, away)}-${Math.max(home, away)}`, 24 * 3600, () => fetchH2H(key, home, away)).then(r => r.data).catch(() => []),
  ]);
  return NextResponse.json({
    home: { form: homeForm || null, rank: null, points: null },
    away: { form: awayForm || null, rank: null, points: null },
    h2h,
  }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } });
}
