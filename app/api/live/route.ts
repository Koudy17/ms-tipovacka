import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { cached } from '@/lib/apiCache';
import { fetchEvents, fetchLive } from '@/lib/apifootball';

// Živé zápasy (minuta, skóre, průběh). Appka to během zápasů volá každých ~30 s; z API se stahuje
// nejvýš jednou za 30 s (seznam) a jednou za minutu na zápas (průběh), ať je počet návštěvníků jedno.
export async function GET() {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return NextResponse.json({ matches: [] });
  const sql = getSql();

  // Mimo zápasy API vůbec nevoláme
  const active = await sql`
    SELECT 1 FROM matches
    WHERE status != 'finished' AND kickoff <= NOW() AND kickoff > NOW() - INTERVAL '4 hours'
    LIMIT 1`;
  if (!active.length) return NextResponse.json({ matches: [] });

  try {
    const live = (await cached('live', 30, () => fetchLive(key))).data;
    if (!live.length) return NextResponse.json({ matches: [] });
    const known = new Set((await sql`SELECT id FROM matches WHERE id = ANY(${live.map(l => l.id)})`).map(r => r.id as number));
    const mine = live.filter(l => known.has(l.id));
    const matches = await Promise.all(mine.map(async l => {
      let events: unknown[] = [];
      try {
        events = (await cached(`events:${l.id}`, 60, () => fetchEvents(key, l.id))).data;
      } catch {
        // průběh se nepodařilo načíst – skóre a minutu ukážeme i tak
      }
      return { ...l, events };
    }));
    return NextResponse.json({ matches });
  } catch {
    return NextResponse.json({ matches: [] });
  }
}
