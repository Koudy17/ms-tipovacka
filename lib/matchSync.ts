import { getSql } from '@/lib/db';
import { calcPoints } from '@/lib/scoring';
import { applyGoalScorers } from '@/lib/scorers';
import { matchState, type ApiFixture } from '@/lib/apifootball';

export interface DbMatch {
  id: number;
  status: string;
  home_score: number | null;
  away_score: number | null;
  scorer_ids: string | null;
  goal_scorers: string | null;
}

/** Přidá zápas z API mezi vybrané (nebo ho znovu zviditelní a obnoví jeho údaje). */
export async function insertFixture(f: ApiFixture): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO matches (id, home_team, away_team, kickoff, stage, status, featured,
      home_logo, away_logo, home_team_id, away_team_id, league_id, league_name, league_logo)
    VALUES (${f.fixture.id}, ${f.teams.home.name}, ${f.teams.away.name}, ${new Date(f.fixture.date).toISOString()}, 'STREAM', 'scheduled', TRUE,
      ${f.teams.home.logo}, ${f.teams.away.logo}, ${f.teams.home.id}, ${f.teams.away.id}, ${f.league.id}, ${f.league.name}, ${f.league.logo})
    ON CONFLICT (id) DO UPDATE SET featured = TRUE`;
}

/**
 * Promítne stav zápasu z API do DB: přesun termínu, živé skóre, dohrání (body, střelci, bonus).
 * Vrací, jestli se něco změnilo a jestli zápas právě skončil (kvůli upozornění na výsledek).
 */
export async function applyFixture(apiKey: string, f: ApiFixture, existing: DbMatch): Promise<{ updated: boolean; finishedNow: boolean }> {
  const sql = getSql();
  const id = f.fixture.id;
  const kickoff = new Date(f.fixture.date).toISOString();
  const state = matchState(f.fixture.status.short);
  const wasFinished = existing.status === 'finished';
  const hs = f.score.fulltime.home ?? f.goals.home;
  const as = f.score.fulltime.away ?? f.goals.away;

  // Údaje o zápase (přesuny termínu, názvy, znaky) – po dohrání už neměnit
  if (!wasFinished) {
    await sql`
      UPDATE matches SET home_team = ${f.teams.home.name}, away_team = ${f.teams.away.name}, kickoff = ${kickoff},
        home_logo = ${f.teams.home.logo}, away_logo = ${f.teams.away.logo},
        home_team_id = ${f.teams.home.id}, away_team_id = ${f.teams.away.id},
        league_id = ${f.league.id}, league_name = ${f.league.name}, league_logo = ${f.league.logo}
      WHERE id = ${id}`;
  }

  if (state === 'live' && hs != null && as != null) {
    await sql`UPDATE matches SET status = 'live', home_score = ${hs}, away_score = ${as} WHERE id = ${id}`;
    return { updated: true, finishedNow: false };
  }

  if (state === 'finished' && hs != null && as != null) {
    const scoreChanged = existing.home_score !== hs || existing.away_score !== as;
    if (wasFinished && !scoreChanged) {
      // střelci se při dohrání nepodařilo zjistit (API je někdy zpozdí) – zkusit znovu, ale ne u ručně zadaných výsledků
      const recent = new Date(kickoff).getTime() > Date.now() - 7 * 24 * 3600 * 1000;
      if (existing.scorer_ids == null && !existing.goal_scorers && recent) await applyGoalScorers(apiKey, id);
      return { updated: false, finishedNow: false };
    }
    await sql`UPDATE matches SET status = 'finished', home_score = ${hs}, away_score = ${as} WHERE id = ${id}`;
    const tips = await sql`SELECT id, home_tip, away_tip FROM tips WHERE match_id = ${id}`;
    for (const tip of tips) {
      await sql`UPDATE tips SET points = ${calcPoints(hs, as, tip.home_tip, tip.away_tip)} WHERE id = ${tip.id}`;
    }
    await applyGoalScorers(apiKey, id); // střelci a bonus +3 b (před odesláním upozornění, ať v nich body sedí)
    return { updated: true, finishedNow: !wasFinished };
  }

  if (state === 'scheduled' && existing.status === 'live') {
    // zápas se vrátil do plánu (chybně označený live) – srovnat
    await sql`UPDATE matches SET status = 'scheduled', home_score = NULL, away_score = NULL WHERE id = ${id}`;
  }
  return { updated: false, finishedNow: false };
}
