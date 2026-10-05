import { NextRequest, NextResponse } from 'next/server';
import { cached } from '@/lib/apiCache';
import { fetchH2H, fetchStandings, type StandingRow } from '@/lib/apifootball';
import { getClientIp, rateLimit } from '@/lib/rateLimit';

// Před tipováním: forma obou týmů (z tabulky) a posledních 5 vzájemných zápasů.
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

  const [standings, h2h] = await Promise.all([
    cached<StandingRow[]>('standings', 600, () => fetchStandings(key)).then(r => r.data).catch(() => [] as StandingRow[]),
    cached(`h2h:${Math.min(home, away)}-${Math.max(home, away)}`, 24 * 3600, () => fetchH2H(key, home, away)).then(r => r.data).catch(() => []),
  ]);
  const row = (id: number) => standings.find(s => s.team.id === id);
  return NextResponse.json({
    home: { form: row(home)?.form ?? null, rank: row(home)?.rank ?? null, points: row(home)?.points ?? null },
    away: { form: row(away)?.form ?? null, rank: row(away)?.rank ?? null, points: row(away)?.points ?? null },
    h2h,
  });
}
