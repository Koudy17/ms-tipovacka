import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { calcPoints } from '@/lib/scoring';
import { checkAdminAuth } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isAdmin = checkAdminAuth(req);

  if (!isVercelCron && !isAdmin) {
    return NextResponse.json({ error: 'Neautorizovano.' }, { status: 401 });
  }

  const apiKey = process.env.FOOTBALL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Chybi FOOTBALL_API_KEY.' }, { status: 500 });
  }

  const sql = getSql();

  const STAGE_MAP: Record<string, string> = {
    GROUP_STAGE: 'Skupinová fáze',
    LAST_32: 'Šestnáctifinále',
    LAST_16: 'Osmifinále',
    QUARTER_FINALS: 'Čtvrtfinále',
    SEMI_FINALS: 'Semifinále',
    THIRD_PLACE: 'O 3. místo',
    FINAL: 'Finále',
  };

  // Načti API + DB zároveň
  const [resFinished, resScheduled, dbMatches] = await Promise.all([
    fetch('https://api.football-data.org/v4/competitions/2000/matches?status=FINISHED', { headers: { 'X-Auth-Token': apiKey }, cache: 'no-store' }),
    fetch('https://api.football-data.org/v4/competitions/2000/matches?status=SCHEDULED', { headers: { 'X-Auth-Token': apiKey }, cache: 'no-store' }),
    sql`SELECT id, home_team, away_team, status FROM matches`,
  ]);
  if (!resFinished.ok) return NextResponse.json({ error: `API error: ${resFinished.status}` }, { status: 502 });

  const dataFinished = await resFinished.json();
  const dataScheduled = resScheduled.ok ? await resScheduled.json() : { matches: [] };
  const apiMatches = [...(dataFinished.matches ?? []), ...(dataScheduled.matches ?? [])];

  // Index DB zápasů pro rychlé vyhledání
  const dbIndex = new Map<string, { id: number; status: string }>();
  for (const m of dbMatches) {
    dbIndex.set(`${m.home_team}|${m.away_team}`, { id: m.id, status: m.status });
  }

  let updated = 0;
  let inserted = 0;
  const toInsert: Array<{ home: string; away: string; kickoff: string; stage: string }> = [];
  const toUpdate: Array<{ id: number; home: number; away: number }> = [];
  const tipsToUpdate: number[] = [];

  for (const am of apiMatches) {
    const homeName = am.homeTeam?.name;
    const awayName = am.awayTeam?.name;
    const kickoff = am.utcDate;
    const stage = STAGE_MAP[am.stage] ?? am.stage ?? 'Skupinová fáze';
    if (!homeName || !awayName || !kickoff) continue;

    const existing = dbIndex.get(`${homeName}|${awayName}`);

    if (!existing) {
      toInsert.push({ home: homeName, away: awayName, kickoff, stage });
      continue;
    }

    const homeGoals = am.score?.fullTime?.home;
    const awayGoals = am.score?.fullTime?.away;
    if (homeGoals == null || awayGoals == null) continue;
    if (existing.status === 'finished') continue;

    toUpdate.push({ id: existing.id, home: homeGoals, away: awayGoals });
  }

  // Batch insert nových zápasů
  for (const m of toInsert) {
    await sql`INSERT INTO matches (home_team, away_team, kickoff, stage, status) VALUES (${m.home}, ${m.away}, ${m.kickoff}, ${m.stage}, 'upcoming')`;
    inserted++;
  }

  // Update výsledků + body
  for (const m of toUpdate) {
    await sql`UPDATE matches SET home_score = ${m.home}, away_score = ${m.away}, status = 'finished' WHERE id = ${m.id}`;
    const tips = await sql`SELECT * FROM tips WHERE match_id = ${m.id}`;
    for (const tip of tips) {
      const pts = calcPoints(m.home, m.away, tip.home_tip, tip.away_tip);
      await sql`UPDATE tips SET points = ${pts} WHERE id = ${tip.id}`;
    }
    updated++;
  }

  return NextResponse.json({ ok: true, updatedMatches: updated, insertedMatches: inserted });
}
