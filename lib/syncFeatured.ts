import { getSql, initSchema } from '@/lib/db';
import { sendResults } from '@/lib/notify';
import { refreshSquadsIfStale } from '@/lib/scorers';
import { applyFixture, type DbMatch } from '@/lib/matchSync';
import { fetchFixturesByIds } from '@/lib/apifootball';

export interface SyncOptions {
  /** live: jen zápasy, které právě začínají nebo běží; jinak všechny nedohrané + čerstvě dohrané bez střelců */
  live?: boolean;
  /** jak dlouho po výkopu se zápas ještě sleduje (hodiny), jen pro live */
  windowHours?: number;
  /** vynutit obnovu soupisek */
  forceSquads?: boolean;
}

/**
 * Synchronizuje vybrané zápasy (featured) s API-Football: živé skóre, dohrání, body, střelci,
 * bonusy a upozornění na výsledky. Volá se z plánovače, z admina i automaticky při používání appky.
 */
export async function runSync(apiKey: string, opts: SyncOptions = {}) {
  const live = !!opts.live;
  const hours = opts.windowHours ?? 3;
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

  const rows = live
    ? await sql`
        SELECT id, status, home_score, away_score, scorer_ids, goal_scorers, home_team_id, away_team_id, home_team, away_team FROM matches
        WHERE featured AND status != 'finished'
          AND kickoff > NOW() - (${hours} * INTERVAL '1 hour') AND kickoff < NOW() + INTERVAL '10 minutes'`
    : await sql`
        SELECT id, status, home_score, away_score, scorer_ids, goal_scorers, home_team_id, away_team_id, home_team, away_team FROM matches
        WHERE featured AND (status != 'finished' OR (scorer_ids IS NULL AND kickoff > NOW() - INTERVAL '7 days'))`;
  if (rows.length === 0) return { ok: true as const, skipped: true as const };

  const fixtures = await fetchFixturesByIds(apiKey, rows.map(r => r.id as number));

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
      squads = await refreshSquadsIfStale(apiKey, [...teams].map(([id, name]) => ({ id, name })), !!opts.forceSquads);
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

  return { ok: true as const, mode: live ? 'live' : 'full', matches: rows.length, updated, finishedNow: finishedIds.length, notified, squads };
}
