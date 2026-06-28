import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { calcPoints } from '@/lib/scoring';
import { checkAdminAuth } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  // Ochrana - bud Vercel Cron nebo admin token
  const authHeader = req.headers.get('authorization');
  const adminToken = req.headers.get('x-admin-token');
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

  // Načti všechny zápasy (hotové i naplánované)
  const [resFinished, resScheduled] = await Promise.all([
    fetch('https://api.football-data.org/v4/competitions/2000/matches?status=FINISHED', { headers: { 'X-Auth-Token': apiKey }, cache: 'no-store' }),
    fetch('https://api.football-data.org/v4/competitions/2000/matches?status=SCHEDULED', { headers: { 'X-Auth-Token': apiKey }, cache: 'no-store' }),
  ]);
  if (!resFinished.ok) return NextResponse.json({ error: `API error: ${resFinished.status}` }, { status: 502 });

  const dataFinished = await resFinished.json();
  const dataScheduled = resScheduled.ok ? await resScheduled.json() : { matches: [] };
  const apiMatches = [...(dataFinished.matches ?? []), ...(dataScheduled.matches ?? [])];

  let updated = 0;
  let inserted = 0;

  for (const am of apiMatches) {
    const homeName = am.homeTeam?.name;
    const awayName = am.awayTeam?.name;
    const kickoff = am.utcDate;
    const stage = STAGE_MAP[am.stage] ?? am.stage ?? 'Skupinová fáze';
    if (!homeName || !awayName || !kickoff) continue;

    const existing = await sql`
      SELECT id, status FROM matches WHERE home_team = ${homeName} AND away_team = ${awayName}
    `;

    if (existing.length === 0) {
      // Nový zápas — vlož do DB
      await sql`
        INSERT INTO matches (home_team, away_team, kickoff, stage, status)
        VALUES (${homeName}, ${awayName}, ${kickoff}, ${stage}, 'upcoming')
      `;
      inserted++;
      continue;
    }

    // Existující zápas — aktualizuj výsledek pokud je finished
    const homeGoals = am.score?.fullTime?.home;
    const awayGoals = am.score?.fullTime?.away;
    if (homeGoals == null || awayGoals == null) continue;
    if (existing[0].status === 'finished') continue;

    const matchId = existing[0].id;
    await sql`UPDATE matches SET home_score = ${homeGoals}, away_score = ${awayGoals}, status = 'finished' WHERE id = ${matchId}`;

    const tips = await sql`SELECT * FROM tips WHERE match_id = ${matchId}`;
    for (const tip of tips) {
      const pts = calcPoints(homeGoals, awayGoals, tip.home_tip, tip.away_tip);
      await sql`UPDATE tips SET points = ${pts} WHERE id = ${tip.id}`;
    }
    updated++;
  }

  return NextResponse.json({ ok: true, updatedMatches: updated, insertedMatches: inserted });
}
