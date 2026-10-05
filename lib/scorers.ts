import { getSql } from '@/lib/db';
import { fetchGoalScorers, fetchSquad } from '@/lib/apifootball';
import { calcScorerBonus } from '@/lib/scoring';

const SQUAD_MAX_AGE_HOURS = 20;

/** Aktualizuje soupisky, když jsou prázdné nebo starší než ~den (nebo vynuceně). */
export async function refreshSquadsIfStale(apiKey: string, teams: { id: number; name: string }[], force = false) {
  const sql = getSql();
  if (!force) {
    const r = await sql`
      SELECT COUNT(DISTINCT team_id)::int AS teams, MIN(updated_at) < NOW() - (${SQUAD_MAX_AGE_HOURS} * INTERVAL '1 hour') AS stale
      FROM players`;
    const have = r[0].teams as number;
    if (have >= teams.length && !r[0].stale) return { refreshed: 0 };
  }

  let refreshed = 0;
  // po 5 týmech najednou, ať to nezahltí API ani funkci
  for (let i = 0; i < teams.length; i += 5) {
    await Promise.all(teams.slice(i, i + 5).map(async t => {
      try {
        const squad = await fetchSquad(apiKey, t.id);
        if (!squad.length) return; // prázdná odpověď nesmí smazat stávající soupisku
        for (const p of squad) {
          await sql`
            INSERT INTO players (id, team_id, team_name, name, position, updated_at)
            VALUES (${p.id}, ${t.id}, ${t.name}, ${p.name}, ${p.position}, NOW())
            ON CONFLICT (id) DO UPDATE SET team_id = EXCLUDED.team_id, team_name = EXCLUDED.team_name,
              name = EXCLUDED.name, position = EXCLUDED.position, updated_at = NOW()`;
        }
        // hráči, kteří tým opustili, ze soupisky zmizí (tipy na ně zůstávají uložené se jménem)
        await sql`DELETE FROM players WHERE team_id = ${t.id} AND updated_at < NOW() - INTERVAL '1 minute'`;
        refreshed++;
      } catch (e) {
        console.error('[squads] tým', t.id, e instanceof Error ? e.message : e);
      }
    }));
  }
  return { refreshed };
}

/** Načte střelce dohraného zápasu z API, uloží je a přidělí bonus +3 b těm, kdo na ně tipovali. */
export async function applyGoalScorers(apiKey: string, matchId: number): Promise<boolean> {
  const sql = getSql();
  let goals;
  try {
    goals = await fetchGoalScorers(apiKey, matchId);
  } catch (e) {
    console.error('[scorers] zápas', matchId, e instanceof Error ? e.message : e);
    return false; // scorer_ids zůstane NULL, příští běh to zkusí znovu
  }
  const ids = [...new Set(goals.map(g => g.id))];
  const names = [...new Set(goals.map(g => g.name))];
  await sql`UPDATE matches SET scorer_ids = ${ids.join(',')}, goal_scorers = ${names.join(',')} WHERE id = ${matchId}`;

  const tips = await sql`SELECT id, scorer_tip, scorer_player_id FROM tips WHERE match_id = ${matchId}`;
  for (const t of tips) {
    const hit = t.scorer_player_id != null
      ? ids.includes(t.scorer_player_id)
      : calcScorerBonus(t.scorer_tip, names) > 0; // starší tipy bez ID: shoda podle jména
    await sql`UPDATE tips SET scorer_points = ${hit ? 3 : 0} WHERE id = ${t.id}`;
  }
  return true;
}
