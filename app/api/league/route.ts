import { NextResponse } from 'next/server';
import { cached } from '@/lib/apiCache';
import { fetchStandings, fetchTopScorers } from '@/lib/apifootball';

// Tabulka Premier League a nejlepší střelci. Z API se stahuje nejvýš jednou za 10 minut.
export async function GET() {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return NextResponse.json({ error: 'Chybí API_FOOTBALL_KEY.' }, { status: 500 });
  try {
    const [standings, scorers] = await Promise.all([
      cached('standings', 600, () => fetchStandings(key)),
      cached('topscorers', 600, () => fetchTopScorers(key)),
    ]);
    return NextResponse.json({
      standings: standings.data,
      topScorers: scorers.data,
      updatedAt: new Date(Math.min(+standings.fetchedAt, +scorers.fetchedAt)).toISOString(),
    }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
  } catch (e) {
    console.error('[league]', e);
    return NextResponse.json({ error: 'Data se nepodařilo načíst.' }, { status: 502 });
  }
}
