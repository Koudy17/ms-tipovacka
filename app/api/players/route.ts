import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

// Soupisky týmů PL (plní je sync z API-Football). `team` = název týmu velkými písmeny
// (kvůli adminu, který páruje podle jména); appka páruje podle team_id.
export async function GET(req: NextRequest) {
  const team = req.nextUrl.searchParams.get('team');
  const sql = getSql();
  const rows = team
    ? await sql`SELECT id, team_id, team_name, name, position FROM players WHERE LOWER(team_name) = LOWER(${team}) ORDER BY name`
    : await sql`SELECT id, team_id, team_name, name, position FROM players ORDER BY team_name, name`;
  // Soupisky se mění max. jednou denně → hodinová mezipaměť na CDN
  return NextResponse.json(rows.map(r => ({
    id: r.id, team_id: r.team_id, team: (r.team_name as string).toUpperCase(), name: r.name, position: r.position,
  })), { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
}
