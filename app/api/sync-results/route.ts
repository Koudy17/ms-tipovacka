import { NextRequest, NextResponse } from 'next/server';
import { getSql, initSchema } from '@/lib/db';
import { checkAdminAuth } from '@/lib/adminAuth';
import { sendResults } from '@/lib/notify';
import { refreshSquadsIfStale } from '@/lib/scorers';
import { applyFixture, type DbMatch } from '@/lib/matchSync';
import { fetchFixturesByIds } from '@/lib/apifootball';

export const maxDuration = 60;

// Synchronizuje JEN vybrané zápasy (featured), každý podle ID.
// mode=full (výchozí): všechny nedohrané + čerstvě dohrané bez střelců. Cron 1× denně + admin.
// mode=live: jen zápasy, které právě začínají nebo běží – bez takového zápasu nevolá API vůbec.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
  if (!isCron && !checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Neautorizovano.' }, { status: 401 });
  }

  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Chybi API_FOOTBALL_KEY.' }, { status: 500 });

  const live = req.nextUrl.searchParams.get('mode') === 'live';
  const sql = getSql();

  // Sloupce a tabulky se doplní automaticky při prvním běhu po nasazení
  try {
    await sql`SELECT featured, league_name FROM matches LIMIT 1`;
    await sql`SELECT scorer_ids, home_team_id FROM matches LIMIT 1`;
    await sql`SELECT scorer_player_id FROM tips LIMIT 1`;
    await sql`SELECT id FROM players LIMIT 1`;
  } catch {
    await initSchema();
  }

  const rows = (live
    ? await sql`
        SELECT id, status, home_score, away_score, scorer_ids, goal_scorers, home_team_id, away_team_id, home_team, away_team FROM matches
        WHERE featured AND status != 'finished'
          AND kickoff > NOW() - INTERVAL '3 hours' AND kickoff < NOW() + INTERVAL '10 minutes'`
    : await sql`
        SELECT id, status, home_score, away_score, scorer_ids, goal_scorers, home_team_id, away_team_id, home_team, away_team FROM matches
        WHERE featured AND (status != 'finished' OR (scorer_ids IS NULL AND kickoff > NOW() - INTERVAL '7 days'))`);
  if (rows.length === 0) return NextResponse.json({ ok: true, skipped: true });

  let fixtures;
  try {
    fixtures = await fetchFixturesByIds(apiKey, rows.map(r => r.id as number));
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 502 });
  }

  const db = new Map(rows.map(r => [r.id as number, r as unknown as DbMatch]));
  let updated = 0;
  const finishedIds: number[] = [];
  for (const f of fixtures) {
    const existing = db.get(f.fixture.id);
    if (!existing) continue;
    const r = await applyFixture(apiKey, f, existing);
    if (r.updated) updated++;
    if (r.finishedNow) finishedIds.push(f.fixture.id);
  }

  // Soupisky pro výběr střelce: v plném běhu, jen týmům, které je nemají/mají zastaralé
  let squads;
  if (!live) {
    try {
      const teams = new Map<number, string>();
      for (const r of rows) {
        if (r.home_team_id) teams.set(r.home_team_id as number, r.home_team as string);
        if (r.away_team_id) teams.set(r.away_team_id as number, r.away_team as string);
      }
      squads = await refreshSquadsIfStale(apiKey, [...teams].map(([id, name]) => ({ id, name })), req.nextUrl.searchParams.get('squads') === '1');
    } catch (e) {
      console.error('[sync] soupisky selhaly', e);
    }
  }

  // Upozornění na výsledky – chyba při odesílání nesmí shodit sync
  let notified;
  try {
    notified = await sendResults(finishedIds);
  } catch (e) {
    console.error('[sync] upozornění na výsledky selhalo', e);
  }

  return NextResponse.json({ ok: true, mode: live ? 'live' : 'full', matches: rows.length, updated, finishedNow: finishedIds.length, notified, squads });
}
