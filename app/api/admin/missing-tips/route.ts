import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { checkAdminAuth } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 });

  const sql = getSql();

  // Dnešní okno: 10:00 SELČ (UTC+2) → zítra 10:00 SELČ
  const now = new Date();
  const selcOffset = 2 * 60; // SELČ = UTC+2
  const localMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() + selcOffset;
  const windowStart = new Date(now);
  if (localMinutes < 10 * 60) {
    windowStart.setUTCDate(windowStart.getUTCDate() - 1);
  }
  windowStart.setUTCHours(8, 0, 0, 0); // 10:00 SELČ = 08:00 UTC
  const windowEnd = new Date(windowStart);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 1);

  // Dnešní zápasy které ještě nezačaly
  const todayMatches = await sql`
    SELECT id, home_team, away_team, kickoff FROM matches
    WHERE kickoff >= ${windowStart.toISOString()}
      AND kickoff < ${windowEnd.toISOString()}
      AND status = 'scheduled'
      AND stage != 'TEST'
    ORDER BY kickoff
  `;

  if (todayMatches.length === 0) {
    return NextResponse.json({ matches: [], missing: [] });
  }

  const matchIds = todayMatches.map(m => m.id);
  const users = await sql`SELECT id, nickname FROM users ORDER BY nickname`;

  // Pro každého uživatele zkontroluj jestli má tip na všechny dnešní zápasy
  const missing: string[] = [];
  for (const user of users) {
    const tips = await sql`
      SELECT match_id FROM tips
      WHERE user_id = ${user.id} AND match_id = ANY(${matchIds})
    `;
    const tippedIds = new Set(tips.map(t => t.match_id));
    const missingMatches = todayMatches.filter(m => !tippedIds.has(m.id));
    if (missingMatches.length > 0) {
      missing.push(user.nickname);
    }
  }

  return NextResponse.json({
    matches: todayMatches.map(m => ({ id: m.id, label: `${m.home_team} vs ${m.away_team}` })),
    missing,
  });
}
