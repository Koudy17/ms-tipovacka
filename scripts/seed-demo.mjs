// Ukázkové zápasy PL pro lokální vývoj bez API klíče.
// Spuštění:  node --env-file=.env.local scripts/seed-demo.mjs         (přidá demo zápasy)
//            node --env-file=.env.local scripts/seed-demo.mjs --clean (smaže je)
// Schéma musí existovat – nejdřív POST /api/admin/migrate.
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.error('Chybí DATABASE_URL (spusť s --env-file=.env.local).');
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

if (process.argv.includes('--clean')) {
  await sql`DELETE FROM tips WHERE match_id IN (SELECT id FROM matches WHERE stage = 'DEMO')`;
  await sql`DELETE FROM matches WHERE stage = 'DEMO'`;
  console.log('Demo zápasy smazány.');
  process.exit(0);
}

const logo = id => `https://media.api-sports.io/football/teams/${id}.png`;
const T = {
  ARS: ['Arsenal', 42], LIV: ['Liverpool', 40], MCI: ['Manchester City', 50], CHE: ['Chelsea', 49],
  MUN: ['Manchester United', 33], TOT: ['Tottenham', 47], NEW: ['Newcastle', 34], AVL: ['Aston Villa', 66],
};
const h = 3600 * 1000;
const now = Date.now();
// [domácí, hosté, posun začátku v hodinách, kolo, stav, skóre]
const rows = [
  ['ARS', 'LIV', -48, 6, 'finished', [2, 1]],
  ['MCI', 'CHE', -47, 6, 'finished', [1, 1]],
  ['MUN', 'TOT', -1, 6, 'live', [0, 1]],
  ['NEW', 'AVL', 3, 7, 'scheduled'],
  ['LIV', 'MCI', 26, 7, 'scheduled'],
  ['CHE', 'ARS', 27, 7, 'scheduled'],
  ['TOT', 'NEW', 24 * 8, 8, 'scheduled'],
  ['AVL', 'MUN', 24 * 8 + 2, 8, 'scheduled'],
];

let id = 9000001;
for (const [home, away, shift, , status, score] of rows) {
  const kickoff = new Date(now + shift * h).toISOString();
  await sql`
    INSERT INTO matches (id, home_team, away_team, kickoff, stage, featured, status, home_score, away_score, home_logo, away_logo)
    VALUES (${id}, ${T[home][0]}, ${T[away][0]}, ${kickoff}, 'DEMO', TRUE, ${status},
            ${score?.[0] ?? null}, ${score?.[1] ?? null}, ${logo(T[home][1])}, ${logo(T[away][1])})
    ON CONFLICT (id) DO UPDATE SET kickoff = EXCLUDED.kickoff, status = EXCLUDED.status,
      home_score = EXCLUDED.home_score, away_score = EXCLUDED.away_score`;
  id++;
}
console.log(`Vloženo ${rows.length} demo zápasů.`);
